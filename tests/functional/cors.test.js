import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { useTestServer } from './server.js';

const CONTRACT_PATH = 'tests/cars.v1.yaml';
const ALLOWED_ORIGIN = 'http://localhost:8080';
const harness = useTestServer(CONTRACT_PATH, {
    cors: {
        origins: [ALLOWED_ORIGIN]
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

describe('CORS responses', () => {
    it('returns access-control headers for allowed origins on normal requests', async () => {
        const res = await server.inject({
            method: 'GET',
            url: '/v1/cars?color=Testing',
            headers: {
                origin: ALLOWED_ORIGIN
            }
        });

        expect(res.statusCode).toBe(200);
        expect(res.headers['access-control-allow-origin']).toBe(ALLOWED_ORIGIN);
        expect(res.headers['vary']).toContain('Origin');
    });

    it('handles preflight requests for allowed origins', async () => {
        const res = await server.inject({
            method: 'OPTIONS',
            url: '/v1/cars',
            headers: {
                origin: ALLOWED_ORIGIN,
                'access-control-request-method': 'GET'
            }
        });

        expect(res.statusCode).toBe(204);
        expect(res.headers['access-control-allow-origin']).toBe(ALLOWED_ORIGIN);
    });

    it('does not allow origins outside the allowlist', async () => {
        const res = await server.inject({
            method: 'GET',
            url: '/v1/cars?color=Testing',
            headers: {
                origin: 'http://evil.example'
            }
        });

        expect(res.statusCode).toBe(200);
        expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });
});
