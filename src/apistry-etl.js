#!/usr/bin/env node

import { program } from 'commander';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import importCmd from './commands/import.js';
import exportCmd from './commands/export.js';
import runEtlCmd from './commands/etl.js';
import { getCliLogger } from './plugins/configPlugin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));

const versionTitle = `Apistry CLI v${pkg.version}`;

// Wrap commands to catch and log errors at CLI boundary
function wrapCommand(cmdFn) {
    return async (...args) => {
        try {
            await cmdFn(...args);
        } catch (err) {
            const log = getCliLogger('error');
            const message = err?.message || 'Command failed';

            log.fatal(
                err,
                message
            );

            // Keep structured semantic fields too (as a second line) for debugging.
            // This avoids losing event/params while guaranteeing the console message.
            if (err?.event || err?.params) {
                log.debug({ event: err?.event ?? 'command_failed', params: err?.params ?? {} });
            }

            process.exit(1);
        }
    };
}

program
    .name('apistry-etl')
    .description(versionTitle)
    .version(`Apistry ETL CLI v${pkg.version}`, '-v, --version', 'Output the version number')
    .showHelpAfterError();

program
    .command('import')
    .description('Import JSON or CSV files into collections')
    .requiredOption('-i, --inputPath <string>', 'Directory (or file) containing JSON files to load')
    .requiredOption('-d, --dbConnection <string>', 'DB Connection String')
    .option('-r, --replace <string>', 'If true will clear collections before loading', 'n')
    .option('-m, --maxDocs <integer>', 'Maximum number of documents to load per file', v => parseInt(v, 10))
    .action(wrapCommand(importCmd));

program
    .command('export')
    .description('Export collection(s) to JSON or CSV files')
    .requiredOption('-o, --outputPath <string>', 'Directory (or file) to save exported files')
    .requiredOption('-d, --dbConnection <string>', 'DB Connection String')
    .option('-c, --collection <string>', 'Name of collection to export')
    .option('-f, --format <string>', 'Export format (json|csv)', 'json')
    .action(wrapCommand(exportCmd));

program
    .command('etl')
    .description('Contract-driven extract, normalize, and load pipelines')
    .requiredOption('-c, --config <string>', 'ETL config YAML file')
    .option('-s, --stage <string>', 'Run a single stage (extract | normalize | load)')
    .option('--dry-run', 'Validate config and show what would run without executing')
    .action(wrapCommand(runEtlCmd));

program.parse(process.argv);
