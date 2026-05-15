import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { useTestServer } from './server.js';

const CONTRACT_PATH = 'tests/security.v1.yaml';
const harness = useTestServer(CONTRACT_PATH, {
    security: {
        bearerToken: 'demo-bearer-token',
        apiKey: {
            key: 'x-api-key',
            value: 'demo-api-key'
        }
    }
});

let server;

beforeAll(async () => {
    await harness.setup();
    server = harness.getServer();
});

afterAll(async () => {
    await harness.teardown();
});

describe('security enforcement', () => {
    it('allows public endpoints with no security definition', async () => {
        const res = await server.inject({
            method: 'GET',
            url: '/v1/metrics'
        });

        expect(res.statusCode).toBe(200);
    });

    it('rejects secured bearer endpoint without auth header', async () => {
        const res = await server.inject({
            method: 'GET',
            url: '/v1/health'
        });

        expect(res.statusCode).toBe(401);
    });

    it('accepts secured bearer endpoint with matching token', async () => {
        const res = await server.inject({
            method: 'GET',
            url: '/v1/health',
            headers: {
                authorization: 'Bearer demo-bearer-token'
            }
        });

        expect(res.statusCode).toBe(200);
        expect(res.json()).toEqual({ status: 'Healthy' });
    });

    it('enforces apiKey endpoint using configured header/value', async () => {
        const res = await server.inject({
            method: 'GET',
            url: '/v1/ready',
            headers: {
                'x-api-key': 'demo-api-key'
            }
        });

        expect(res.statusCode).toBe(200);
        expect(res.json()).toEqual({ status: 'Ready' });
    });

    it('supports OR security requirements (bearer OR apiKey)', async () => {
        const viaBearer = await server.inject({
            method: 'GET',
            url: '/v1/orchestration-actions',
            headers: {
                authorization: 'Bearer demo-bearer-token'
            }
        });

        const viaApiKey = await server.inject({
            method: 'GET',
            url: '/v1/orchestration-actions',
            headers: {
                'x-api-key': 'demo-api-key'
            }
        });

        expect(viaBearer.statusCode).toBe(200);
        expect(viaApiKey.statusCode).toBe(200);
    });
});

describe('security disabled when runtime config is missing', () => {
    const unsecuredHarness = useTestServer(CONTRACT_PATH);
    let unsecuredServer;

    beforeAll(async () => {
        await unsecuredHarness.setup();
        unsecuredServer = unsecuredHarness.getServer();
    });

    afterAll(async () => {
        await unsecuredHarness.teardown();
    });

    it('allows secured bearer endpoints without credentials', async () => {
        const res = await unsecuredServer.inject({
            method: 'GET',
            url: '/v1/health'
        });

        expect(res.statusCode).toBe(200);
    });

    it('allows secured apiKey endpoints without credentials', async () => {
        const res = await unsecuredServer.inject({
            method: 'GET',
            url: '/v1/ready'
        });

        expect(res.statusCode).toBe(200);
    });
});
