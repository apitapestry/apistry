import AdmZip from 'adm-zip';
import { spawnSync } from 'node:child_process';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { builtinModules } from 'node:module';
import path from 'node:path';

const packageRoot = process.cwd();
const outputRoot = path.join(packageRoot, 'dist-lambda');
const stagingDir = path.join(outputRoot, 'package');
const zipPath = path.join(outputRoot, 'apistry-lambda.zip');

await rm(outputRoot, { recursive: true, force: true });
await mkdir(stagingDir, { recursive: true });

await cp(path.join(packageRoot, 'dist', 'index.js'), path.join(stagingDir, 'index.js'));
await cp(path.join(packageRoot, 'dist', 'config.default.yml'), path.join(stagingDir, 'config.default.yml'));
await cp(
    path.join(packageRoot, 'dist', 'validation'),
    path.join(stagingDir, 'validation'),
    { recursive: true }
);
await cp(
    path.join(packageRoot, 'dist', 'validation', 'validations', 'statePostalCode.json'),
    path.join(stagingDir, 'statePostalCode.json')
);
await cp(path.join(packageRoot, 'dist', 'orchestration'), path.join(stagingDir, 'orchestration'), {
    recursive: true
});
await cp(path.join(packageRoot, 'dist', 'utils'), path.join(stagingDir, 'utils'), {
    recursive: true
});
await cp(path.join(packageRoot, 'docs-site', 'static', 'contracts'), path.join(stagingDir, 'contracts'), {
    recursive: true
});

const packageJson = JSON.parse(await readFile(path.join(packageRoot, 'package.json'), 'utf8'));
const packageLock = JSON.parse(await readFile(path.join(packageRoot, 'package-lock.json'), 'utf8'));
const lambdaEntry = await readFile(path.join(stagingDir, 'index.js'), 'utf8');
const lambdaPackageJson = {
    name: `${packageJson.name}-lambda`,
    version: packageJson.version,
    type: packageJson.type,
    main: 'index.js',
    dependencies: getLambdaDependencies(lambdaEntry, packageJson, packageLock),
    overrides: packageJson.overrides
};

await writeFile(
    path.join(stagingDir, 'package.json'),
    `${JSON.stringify(lambdaPackageJson, null, 2)}\n`
);
await cp(path.join(packageRoot, 'package-lock.json'), path.join(stagingDir, 'package-lock.json'));

run('npm', ['install', '--omit=dev', '--package-lock-only']);
run('npm', ['ci', '--omit=dev']);

const zip = new AdmZip();
zip.addLocalFolder(stagingDir);
zip.writeZip(zipPath);

console.log(`Lambda package created: ${path.relative(packageRoot, zipPath)}`);

function run(command, args) {
    const result = spawnSync(command, args, {
        cwd: stagingDir,
        stdio: 'inherit'
    });

    if (result.status !== 0) {
        throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status}`);
    }
}

function getLambdaDependencies(entrySource, rootPackageJson, packageLock) {
    const builtins = new Set([
        ...builtinModules,
        ...builtinModules.map((name) => `node:${name}`)
    ]);
    const dependencyNames = new Set();
    const dependencyPattern = /(?:from|import\()\s*["']([^"']+)["']|require\(["']([^"']+)["']\)/g;
    let match;

    while ((match = dependencyPattern.exec(entrySource))) {
        const specifier = match[1] || match[2];
        if (specifier.startsWith('.') || specifier.startsWith('/') || builtins.has(specifier)) {
            continue;
        }

        dependencyNames.add(getPackageName(specifier));
    }

    return Object.fromEntries(
        [...dependencyNames]
            .filter((name) => name !== 'better-sqlite3')
            .map((name) => [name, getDependencyVersion(name, rootPackageJson, packageLock)])
            .filter(([, version]) => version)
            .sort(([left], [right]) => left.localeCompare(right))
    );
}

function getPackageName(specifier) {
    if (specifier.startsWith('@')) {
        return specifier.split('/').slice(0, 2).join('/');
    }

    return specifier.split('/')[0];
}

function getDependencyVersion(name, rootPackageJson, packageLock) {
    if (rootPackageJson.dependencies?.[name]) {
        return rootPackageJson.dependencies[name];
    }

    return packageLock.packages?.[`node_modules/${name}`]?.version;
}
