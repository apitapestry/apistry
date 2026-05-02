import { describe, it, expect } from 'vitest';
import { spawn } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI_PATH = join(__dirname, '..', '..', 'src', 'apistry.js');
const ETL_CLI_PATH = join(__dirname, '..', '..', 'src', 'apistry-etl.js');
import pkg from "../../package.json" with { type: "json" };

/**
 * Helper function to execute CLI commands
 * @param {string[]} args - Command line arguments
 * @param {string} input - Optional stdin input
 * @param {number} timeout - Timeout in milliseconds
 * @param {Object} envOverrides - Environment variable overrides
 * @param {boolean} etl - Whether to use apistry-etl.js
 * @returns {Promise<{stdout: string, stderr: string, exitCode: number}>}
 */
function runCLI(args, input = '', timeout = 5000, envOverrides = {}, etl = false) {
    return new Promise((resolve, reject) => {
        const cliPath = etl ? ETL_CLI_PATH : CLI_PATH;
        const child = spawn('node', [cliPath, ...args], {
            cwd: join(__dirname, '..', '..'),
            env: { ...process.env, NODE_ENV: 'test', ...envOverrides }
        });

        let stdout = '';
        let stderr = '';
        let killed = false;

        const timer = setTimeout(() => {
            killed = true;
            child.kill('SIGTERM');
            reject(new Error(`Command timed out after ${timeout}ms`));
        }, timeout);

        child.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        child.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        if (input) {
            child.stdin.write(input);
            child.stdin.end();
        }

        child.on('close', (exitCode) => {
            clearTimeout(timer);
            if (!killed) {
                resolve({ stdout, stderr, exitCode });
            }
        });

        child.on('error', (error) => {
            clearTimeout(timer);
            if (!killed) {
                reject(error);
            }
        });
    });
}

function getJsonLogByEvent(output, eventName) {
    return output
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean)
        .map(line => {
            try {
                return JSON.parse(line);
            } catch {
                return null;
            }
        })
        .find(entry => entry?.event === eventName);
}

describe('APIstry CLI', () => {
    describe('Basic CLI functionality', () => {
        it('should display help when --help is used', async () => {
            const { stdout, exitCode } = await runCLI(['--help']);

            expect(exitCode).toBe(0);
            expect(stdout).toContain('Apistry CLI');
            expect(stdout).toContain('start');
        });

        it('should display version when --version is used', async () => {
            const { stdout, exitCode } = await runCLI(['--version']);

            expect(exitCode).toBe(0);
            expect(stdout).toContain('Apistry CLI v' + pkg.version);
        });
    });

    describe('start command', () => {
        it('should display help for start command', async () => {
            const { stdout, exitCode } = await runCLI(['start', '--help']);

            expect(exitCode).toBe(0);
            expect(stdout).toContain('Start Apistry Server');
            expect(stdout).toContain('--logLevel');
            expect(stdout).toContain('--config');
        });

        it('should emit startup logs as one-line JSON with explicit CLI options', async () => {
            const { stdout, stderr, exitCode } = await runCLI(
                ['start', '--contract', 'docs-site/static/contracts', '--dbDir', 'data/sqlite.db', '--port', '3000', '--logLevel', 'info'],
                '',
                15000
            );

            expect(exitCode).toBe(0);
            expect(stderr).toBe('');
            expect(stdout).not.toContain('🚀 serve');
            expect(stdout).not.toContain('INFO: db_connected');

            const dbConnected = getJsonLogByEvent(stdout, 'db_connected');
            const serverStarted = getJsonLogByEvent(stdout, 'server_started');

            expect(dbConnected).toMatchObject({
                level: 'INFO',
                service: 'apistry',
                env: 'test',
                event: 'db_connected',
                params: {
                    dbType: 'sqlite',
                    connection: expect.stringContaining('sqlite://')
                },
                msg: 'db_connected'
            });
            expect(typeof dbConnected.ts).toBe('string');

            expect(serverStarted).toMatchObject({
                level: 'INFO',
                service: 'apistry',
                env: 'test',
                event: 'server_started',
                params: {
                    listenAddress: 'http://localhost:3000',
                    openApiServerUrl: '/'
                }
            });
            expect(typeof serverStarted.ts).toBe('string');
        });

        it('should emit startup logs as one-line JSON with config defaults', async () => {
            const { stdout, stderr, exitCode } = await runCLI(
                ['start', '--config', 'config.yml'],
                '',
                15000,
                { API_KEY: 'test-api-key' }
            );

            expect(exitCode).toBe(0);
            expect(stderr).toBe('');
            expect(stdout).not.toContain('INFO: db_connected');
            expect(stdout).not.toContain('INFO: license_verified');

            const dbConnected = getJsonLogByEvent(stdout, 'db_connected');
            const licenseVerified = getJsonLogByEvent(stdout, 'license_verified');
            const serverStarted = getJsonLogByEvent(stdout, 'server_started');

            expect(dbConnected).toMatchObject({
                level: 'INFO',
                service: 'apistry',
                env: 'test',
                event: 'db_connected',
                params: {
                    dbType: 'sqlite',
                    connection: expect.stringContaining('sqlite://')
                },
                msg: 'db_connected'
            });
            expect(typeof dbConnected.ts).toBe('string');

            expect(serverStarted).toMatchObject({
                level: 'INFO',
                service: 'apistry',
                env: 'test',
                event: 'server_started',
                params: {
                    listenAddress: 'http://localhost:3000',
                    openApiServerUrl: '/'
                }
            });
            expect(typeof serverStarted.ts).toBe('string');
            expect(licenseVerified).toBeUndefined();
        });
    });

    describe('import command', () => {
        it('should display help for import command', async () => {
            const { stdout, exitCode } = await runCLI(['import', '--help'], '', 5000, {}, true);

            expect(exitCode).toBe(0);
            expect(stdout).toContain('Import JSON or CSV files into collections');
            expect(stdout).toContain('--inputPath');
        });

        it('should require inputPath option', async () => {
            const { stderr, exitCode } = await runCLI(['import'], '', 5000, {}, true);

            expect(exitCode).toBe(1);
            expect(stderr).toContain('required option');
            expect(stderr).toContain('inputPath');
        });

        it('should require dbConnection option', async () => {
            const { stderr, exitCode } = await runCLI(['import', '--inputPath', './does-not-matter'], '', 5000, {}, true);

            expect(exitCode).toBe(1);
            expect(stderr).toContain('required option');
            expect(stderr).toContain('dbConnection');
        });
    });

    describe('export command', () => {
        it('should display help for export command', async () => {
            const { stdout, exitCode } = await runCLI(['export', '--help'], '', 5000, {}, true);

            expect(exitCode).toBe(0);
            expect(stdout).toContain('Export collection(s) to JSON or CSV files');
            expect(stdout).toContain('--outputPath');
        });

        it('should require outputPath option', async () => {
            const { stderr, exitCode } = await runCLI(['export'], '', 5000, {}, true);

            expect(exitCode).toBe(1);
            expect(stderr).toContain('required option');
            expect(stderr).toContain('outputPath');
        });
    });
});
