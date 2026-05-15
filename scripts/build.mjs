import { build } from 'esbuild';
import { glob } from 'glob';
import { mkdir, copyFile } from 'node:fs/promises';
import path from 'node:path';

const entryPoints = await glob(['src/**/*.js', 'src/**/*.mjs'], { nodir: true });

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

await build({
  entryPoints: ['index.js'],
  outfile: 'dist/index.js',
  platform: 'node',
  format: 'esm',
  target: 'node18',
  bundle: true,
  packages: 'external',
  minify: false,
  treeShaking: true,
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
