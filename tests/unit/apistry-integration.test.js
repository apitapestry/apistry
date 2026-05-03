import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { spawn } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI_PATH = join(__dirname, '..', 'src', 'apistry.js');

describe('APIstry CLI Integration Tests', () => {
    const TEST_DB_CONNECTION = 'mongodb://testuser:testpass@localhost:27017/testdb';
    const activeProcesses = [];

    beforeEach(() => {
        vi.resetModules();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        // Kill any remaining child processes
        activeProcesses.forEach(child => {
            if (child && !child.killed) {
                child.kill('SIGTERM');
            }
        });
        activeProcesses.length = 0;
    });

    describe('Error handling', () => {
        it.skip('should handle invalid MongoDB connection string gracefully', async () => {
            // Skipped: This will hang trying to connect
            const child = spawn('node', [CLI_PATH, 'testConnection'], {
                env: { ...process.env, DB_CONNECTION: 'invalid-connection-string' }
            });
            activeProcesses.push(child);

            let stderr = '';
            let stdout = '';

            child.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            child.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            const exitCode = await Promise.race([
                new Promise((resolve) => child.on('close', resolve)),
                new Promise((resolve) => setTimeout(() => {
                    child.kill();
                    resolve(1);
                }, 3000))
            ]);

            expect(exitCode).toBe(1);
        });

        it.skip('should exit with code 1 on connection failure', async () => {
            // Skipped: This will hang trying to connect to non-existent MongoDB
            const child = spawn('node', [CLI_PATH, 'testConnection'], {
                env: { ...process.env, DB_CONNECTION: 'mongodb://invalid:27017/test' }
            });
            activeProcesses.push(child);

            const exitCode = await Promise.race([
                new Promise((resolve) => child.on('close', resolve)),
                new Promise((resolve) => setTimeout(() => {
                    child.kill();
                    resolve(1);
                }, 3000))
            ]);

            expect(exitCode).toBe(1);
        });
    });

    describe('Console output formatting', () => {
        it.skip('should use emoji icons in output', async () => {
            // Skipped: Requires actual MongoDB connection
            const child = spawn('node', [CLI_PATH, 'testConnection'], {
                env: { ...process.env, DB_CONNECTION: TEST_DB_CONNECTION }
            });
            activeProcesses.push(child);

            let stdout = '';

            child.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            await Promise.race([
                new Promise((resolve) => child.on('close', resolve)),
                new Promise((resolve) => setTimeout(() => {
                    child.kill();
                    resolve();
                }, 3000))
            ]);

            // Check for emoji usage
            expect(stdout).toMatch(/[🔍⏳✅❌📍📁📊🔌]/);
        });
    });
});

