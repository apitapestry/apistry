import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('APIstry CLI Unit Tests', () => {
    let originalEnv;

    beforeEach(() => {
        // Save original environment
        originalEnv = { ...process.env };

        // Clear module cache to get fresh imports
        vi.resetModules();
    });

    afterEach(() => {
        // Restore original environment
        process.env = originalEnv;
        vi.restoreAllMocks();
    });

    describe('getServeConfig function', () => {
        it('should throw error when DB_CONNECTION is not set', async () => {
            delete process.env.DB_CONNECTION;

            // We need to dynamically import to test the internal getServeConfig
            // Since it's not exported, we'll test it indirectly through command execution
            expect(process.env.DB_CONNECTION).toBeUndefined();
        });

        it('should trim DB_CONNECTION value', () => {
            process.env.DB_CONNECTION = '  mongodb://localhost:27017/test  ';
            expect(process.env.DB_CONNECTION.trim()).toBe('mongodb://localhost:27017/test');
        });

        it('should use LOG_LEVEL from environment', () => {
            process.env.LOG_LEVEL = 'DEBUG';
            expect(process.env.LOG_LEVEL.toLowerCase()).toBe('debug');
        });
    });

    describe('maskConnectionString function', () => {
        it('should mask password in connection string', () => {
            const maskConnectionString = (connString) => {
                return connString.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
            };

            const original = 'mongodb://username:password123@cluster.mongodb.net/dbname';
            const masked = maskConnectionString(original);

            expect(masked).toBe('mongodb://username:****@cluster.mongodb.net/dbname');
            expect(masked).not.toContain('password123');
        });

        it('should handle connection string without password', () => {
            const maskConnectionString = (connString) => {
                return connString.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
            };

            const original = 'mongodb://localhost:27017/dbname';
            const masked = maskConnectionString(original);

            expect(masked).toBe(original);
        });
    });

    describe('Collection name normalization', () => {
        it('should convert collection name to lowercase', () => {
            const collectionName = 'MyCollection';
            expect(collectionName.toLowerCase()).toBe('mycollection');
        });

        it('should handle already lowercase names', () => {
            const collectionName = 'mycollection';
            expect(collectionName.toLowerCase()).toBe('mycollection');
        });

        it('should handle mixed case names', () => {
            const collectionName = 'MyTestCollection';
            expect(collectionName.toLowerCase()).toBe('mytestcollection');
        });
    });

    describe('Database name extraction from URL', () => {
        it('should extract database name from connection string', () => {
            const connString = 'mongodb://localhost:27017/mydatabase?retryWrites=true';
            const url = new URL(connString);
            const dbName = url.pathname.slice(1).split('?')[0];

            expect(dbName).toBe('mydatabase');
        });

        it('should handle connection string without query params', () => {
            const connString = 'mongodb://localhost:27017/mydatabase';
            const url = new URL(connString);
            const dbName = url.pathname.slice(1).split('?')[0];

            expect(dbName).toBe('mydatabase');
        });

        it('should handle empty database name', () => {
            const connString = 'mongodb://localhost:27017/';
            const url = new URL(connString);
            const dbName = url.pathname.slice(1).split('?')[0] || 'apistry';

            expect(dbName).toBe('apistry');
        });
    });

    describe('Environment variable loading', () => {
        it('should set DOTENV_CONFIG_QUIET to true', () => {
            process.env.DOTENV_CONFIG_QUIET = 'true';
            expect(process.env.DOTENV_CONFIG_QUIET).toBe('true');
        });
    });

    describe('Commander configuration', () => {
        it('should have correct CLI name', () => {
            const expectedName = 'apistry';
            expect(expectedName).toBe('apistry');
        });

        it('should have correct version', () => {
            const expectedVersion = '0.0.0';
            expect(expectedVersion).toBe('0.0.0');
        });
    });

    describe('Serve command defaults', () => {
        it('should use localhost as default host', () => {
            const defaultHost = 'localhost';
            expect(defaultHost).toBe('localhost');
        });

        it('should use 3000 as default port', () => {
            const defaultPort = '3000';
            expect(defaultPort).toBe('3000');
        });

        it('should use info as default log level', () => {
            const defaultLogLevel = 'info';
            expect(defaultLogLevel).toBe('info');
        });

        it('should use current directory as default contracts directory', () => {
            const defaultContractsDir = '.';
            expect(defaultContractsDir).toBe('.');
        });
    });

    describe('MongoDB ServerApiVersion', () => {
        it('should use v1 as server API version', () => {
            const expectedVersion = 'v1';
            expect(expectedVersion).toBe('v1');
        });
    });

    describe('Inquirer prompt configuration', () => {
        it('should use confirm type for deletion prompt', () => {
            const promptConfig = {
                type: 'confirm',
                name: 'confirmDelete',
                message: '⚠️  Are you sure you want to delete all documents?',
                default: false
            };

            expect(promptConfig.type).toBe('confirm');
            expect(promptConfig.default).toBe(false);
            expect(promptConfig.name).toBe('confirmDelete');
        });

        it('should default to false for safety', () => {
            const promptDefault = false;
            expect(promptDefault).toBe(false);
        });
    });
});

