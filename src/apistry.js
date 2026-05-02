#!/usr/bin/env node

import { program } from 'commander';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import serveCmd from './commands/serverStart.js';
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
    .name('apistry')
    .description(versionTitle)
    .version(`Apistry CLI v${pkg.version}`, '-v, --version', 'Output the version number')
    .showHelpAfterError();

program
    .command('start')
    .description('Start Apistry Server')
    .option('-c, --contract <string>', 'Path of contract file or directory')
    .option('-d, --dbDir <string>', 'Directory for local database', 'IN-MEMORY-DB')
    .option('-p, --port <string>', 'Service Port', 3000)
    .option('-l, --logLevel <string>', 'Log level (debug|info|warn|error)', 'info')
    .option('--config <string>', 'Path to config file (optional - overrides defaults)')
    .action(wrapCommand(serveCmd));

program.parse(process.argv);
