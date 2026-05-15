import { build } from 'esbuild';
import { glob } from 'glob';
import { mkdir, copyFile } from 'node:fs/promises';
import path from 'node:path';

const entryPoints = await glob(['src/**/*.js', 'src/**/*.mjs'], { nodir: true });
const esmRequireShim = {
  js: "import { createRequire } from 'node:module';\nconst require = createRequire(import.meta.url);"
};

if (!entryPoints.length) {
  throw new Error('No entry points found under src/**/*.js or src/**/*.mjs');
}

await build({
  entryPoints,
  outdir: 'dist',
  platform: 'node',
  format: 'esm',
  target: 'node18',
  minify: false,
  treeShaking: true,
  loader: {
    '.json': 'json'
  }
});

// Build the main lambda-compatible entry as an externalized bundle for npm (keep packages external)
await build({
  entryPoints: ['index.js'],
  outfile: 'dist/index.js',
  platform: 'node',
  format: 'esm',
  target: 'node18',
  bundle: true,
  // Keep package deps external for the npm-published build so consumers install deps via package.json
  packages: 'external',
  banner: esmRequireShim,
  minify: true,
  treeShaking: true,
  loader: {
    '.json': 'json'
  }
});

// Additionally produce a lambda-optimized single-file bundle that inlines dependencies
// but marks native modules as external so they can be supplied via a Layer.
await build({
  entryPoints: ['index.js'],
  outfile: 'dist-lambda/index.js',
  platform: 'node',
  format: 'esm',
  target: 'node18',
  bundle: true,
  banner: esmRequireShim,
  minify: true,
  treeShaking: true,
  // Mark native modules (that must be prebuilt for Amazon Linux) as external.
  external: ['better-sqlite3'],
  loader: {
    '.json': 'json'
  }
});

// Copy JSON assets required at runtime.
await mkdir('dist/validation/validations', { recursive: true });
await copyFile(
  path.join('src', 'validation', 'validations', 'statePostalCode.json'),
  path.join('dist', 'validation', 'validations', 'statePostalCode.json')
);
await copyFile(
  path.join('src', 'config.default.yml'),
  path.join('dist', 'config.default.yml')
);

// Optionally copy README and LICENSE if needed for npm publish/install
await copyFile('README.md', path.join('dist', 'README.md'));
await copyFile('LICENSE', path.join('dist', 'LICENSE'));
