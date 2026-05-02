#!/usr/bin/env node
// docsApi-build.mjs
// Runs docusaurus clear & build, then zips the build output to ../docs-site/static/docs.zip
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';

const DOCS_API_SITE = resolve(dirname(new URL(import.meta.url).pathname), '../docs-api-site');
const TARGET = resolve(dirname(new URL(import.meta.url).pathname), '../data');
const BUILD_DIR = join(DOCS_API_SITE, 'build');
const ZIP_PATH = join(TARGET, 'docs.zip');

function run(cmd, opts = {}) {
  console.log(`$ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', ...opts });
}

try {
  // Step 1: Build docs-api-site
  process.chdir(DOCS_API_SITE);
  run('npx docusaurus clear');
  run('npx docusaurus build');

  // Step 2: Ensure output directory exists
  if (!existsSync(TARGET)) {
    mkdirSync(TARGET, { recursive: true });
  }

  // Step 3: Zip the build output
  process.chdir(BUILD_DIR);
  run(`zip -r -q ${ZIP_PATH} .`);
  console.log(`Zipped build to ${ZIP_PATH}`);
} catch (err) {
  console.error('Build or zip failed:', err);
  process.exit(1);
}

