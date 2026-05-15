import AdmZip from 'adm-zip';
import { spawnSync } from 'node:child_process';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { builtinModules } from 'node:module';
import path from 'node:path';

const packageRoot = process.cwd();
const outputRoot = path.join(packageRoot, 'dist-lambda');
const sqliteDependency = 'better-sqlite3';
const runtimeAssetDependencies = ['i18n-iso-countries'];
const lambdaPackages = [
    {
        label: 'Lambda package',
        includeSqlite: false,
        stagingDir: path.join(outputRoot, 'package'),
        zipPath: path.join(outputRoot, 'apistry-lambda.zip')
    },
    {
        label: 'Lambda package with SQLite',
        includeSqlite: true,
        stagingDir: path.join(outputRoot, 'package-sqlite'),
        zipPath: path.join(outputRoot, 'apistry-lambda-sqlite.zip')
    }
];

const bundleOnly = process.env.LAMBDA_BUNDLE_ONLY === '1' || process.argv.includes('--bundle-only');
if (bundleOnly) {
    console.log('Bundle-only mode: skipping node_modules install; external dependencies must be provided by Lambda Layers');
} else if (process.platform !== 'linux') {
    console.warn('Warning: the SQLite Lambda package includes native modules built on a non-Linux host.\nNative modules (e.g. better-sqlite3) must be built for Amazon Linux.\nConsider building node_modules inside an Amazon Linux Docker container.');
}

const packageJson = JSON.parse(await readFile(path.join(packageRoot, 'package.json'), 'utf8'));
const packageLock = JSON.parse(await readFile(path.join(packageRoot, 'package-lock.json'), 'utf8'));

for (const lambdaPackage of lambdaPackages) {
    await createLambdaPackage(lambdaPackage);
}

async function createLambdaPackage({ label, includeSqlite, stagingDir, zipPath }) {
    console.log(`${label}: ${includeSqlite ? 'including' : 'excluding'} optional SQLite dependency`);

    // Remove previous staging for this variant but keep outputRoot because the build may
    // have produced dist-lambda/index.js before this script runs.
    await rm(stagingDir, { recursive: true, force: true });
    await mkdir(stagingDir, { recursive: true });

    // If a lambda-optimized single-file bundle exists, use it. Otherwise fall back to dist/ files.
    try {
        await cp(path.join(packageRoot, 'dist-lambda', 'index.js'), path.join(stagingDir, 'index.js'));
        console.log(`${label}: using lambda-optimized bundle dist-lambda/index.js`);
    } catch (err) {
        await cp(path.join(packageRoot, 'dist', 'index.js'), path.join(stagingDir, 'index.js'));
    }

    await copyRuntimeAssets(stagingDir);

    const lambdaEntry = await readFile(path.join(stagingDir, 'index.js'), 'utf8');
    const lambdaPackageJson = {
        name: `${packageJson.name}-lambda`,
        version: packageJson.version,
        type: packageJson.type,
        main: 'index.js',
        dependencies: getLambdaDependencies(
            lambdaEntry,
            packageJson,
            packageLock,
            includeSqlite ? [...runtimeAssetDependencies, sqliteDependency] : runtimeAssetDependencies,
            includeSqlite ? [] : [sqliteDependency]
        ),
        overrides: packageJson.overrides
    };

    await writeFile(
        path.join(stagingDir, 'package.json'),
        `${JSON.stringify(lambdaPackageJson, null, 2)}\n`
    );
    await cp(path.join(packageRoot, 'package-lock.json'), path.join(stagingDir, 'package-lock.json'));

    if (!bundleOnly && Object.keys(lambdaPackageJson.dependencies).length > 0) {
        run('npm', ['install', '--omit=dev', '--package-lock-only'], stagingDir);
        run('npm', ['ci', '--omit=dev'], stagingDir);
    } else if (!bundleOnly) {
        console.log(`${label}: no external production dependencies to install`);
    } else {
        console.log(`${label}: package.json still declares external dependencies for Layer compatibility`);
    }

    const zip = new AdmZip();
    zip.addLocalFolder(stagingDir);
    zip.writeZip(zipPath);

    console.log(`${label} created: ${path.relative(packageRoot, zipPath)}`);
}

async function copyRuntimeAssets(stagingDir) {
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
    await cp(
        path.join(packageRoot, 'node_modules', '@seriousme', 'openapi-schema-validator', 'schemas'),
        path.join(stagingDir, 'schemas'),
        { recursive: true }
    );
    await cp(
        path.join(packageRoot, 'node_modules', '@fastify', 'swagger-ui', 'static'),
        path.join(stagingDir, 'swagger-ui-static'),
        { recursive: true }
    );
}

function run(command, args, cwd) {
    const result = spawnSync(command, args, {
        cwd,
        stdio: 'inherit'
    });

    if (result.status !== 0) {
        throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status}`);
    }
}

function getLambdaDependencies(
    entrySource,
    rootPackageJson,
    packageLock,
    additionalDependencies = [],
    excludedDependencies = []
) {
    const builtins = new Set([
        ...builtinModules,
        ...builtinModules.map((name) => `node:${name}`)
    ]);
    const dependencyNames = new Set();
    const excludedDependencyNames = new Set(excludedDependencies);
    const dependencyPattern = /(?:from|import\()\s*["']([^"']+)["']|require\(["']([^"']+)["']\)/g;
    let match;

    while ((match = dependencyPattern.exec(entrySource))) {
        const specifier = match[1] || match[2];
        if (specifier.startsWith('.') || specifier.startsWith('/') || builtins.has(specifier)) {
            continue;
        }

        const packageName = getPackageName(specifier);
        if (!excludedDependencyNames.has(packageName)) {
            dependencyNames.add(packageName);
        }
    }

    for (const name of additionalDependencies) {
        dependencyNames.add(name);
    }

    return Object.fromEntries(
        [...dependencyNames]
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
