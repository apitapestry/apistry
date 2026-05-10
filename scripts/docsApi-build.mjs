#!/usr/bin/env node
// docsApi-build.mjs
// Runs the docs-site build, then zips the build output to data/docs.zip.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const DOCS_SITE = resolve(scriptDir, '../docs-site');
const TARGET = resolve(scriptDir, '../data');
const BUILD_DIR = join(DOCS_SITE, 'build');
const ZIP_PATH = join(TARGET, 'docs.zip');

function run(command, args, opts = {}) {
  console.log(`$ ${[command, ...args].join(' ')}`);
  const result = spawnSync(command, args, { stdio: 'inherit', ...opts });

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status}`);
  }
}

try {
  // Step 1: Build docs-site
  run('npm', ['run', 'build'], { cwd: DOCS_SITE });

  // Step 2: Ensure output directory exists
  if (!existsSync(TARGET)) {
    mkdirSync(TARGET, { recursive: true });
  }

  // Step 3: Zip the build output
  run('zip', ['-r', '-q', ZIP_PATH, '.'], { cwd: BUILD_DIR });
  console.log(`Zipped build to ${ZIP_PATH}`);
} catch (err) {
  console.error('Build or zip failed:', err);
  process.exit(1);
}
