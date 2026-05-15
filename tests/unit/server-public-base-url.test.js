import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { serverStart } from '../../src/commands/serverStart.js';
import { resolveServerConfig } from '../../src/utils/configHelpers.js';

const contractPath = path.resolve(process.cwd(), 'tests/cars.v1.yaml');

function makeRuntimeConfig(overrides = {}) {
    return {
        contractPath,
        dbConnection: 'sqlite://IN-MEMORY-DB',
        logLevel: 'silent',
        logMode: 'test',
        host: '0.0.0.0',
        port: 3000,
        swaggerEnabled: false,
        serviceName: 'Test API',
        serviceDesc: 'Test API',
        ...overrides
    };
}

describe('server bind host and relative openapi server', () => {
    let originalEnv;

    beforeEach(() => {
        originalEnv = { ...process.env };
        process.env.NODE_ENV = 'test';
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it('keeps 0.0.0.0 as the bind host while advertising a root-relative OpenAPI server URL', async () => {
        const app = await serverStart(makeRuntimeConfig({
            publicBaseUrl: 'https://api.apistry.net'
        }));

        try {
            expect(app.config.host).toBe('0.0.0.0');
            expect(app.openapiSpec.servers).toEqual([{ url: '/' }]);
        } finally {
            await app.close();
        }
    });

    it('uses the same root-relative OpenAPI server URL when no publicBaseUrl is configured', async () => {
        const app = await serverStart(makeRuntimeConfig());

        try {
            expect(app.config.host).toBe('0.0.0.0');
            expect(app.openapiSpec.servers).toEqual([{ url: '/' }]);
        } finally {
            await app.close();
        }
    });

    it('prefers environment variables over config file values for bind host and port', () => {
        process.env.HOST = '0.0.0.0';
        process.env.PORT = '4000';

        const resolved = resolveServerConfig({
            host: '127.0.0.1',
            port: 3000,
            publicBaseUrl: 'https://config.example.com'
        });

        expect(resolved).toEqual({
            host: '0.0.0.0',
            port: 4000
        });
    });
});
