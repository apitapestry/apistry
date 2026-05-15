import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { useTestServer } from './server.js';

const CONTRACT_PATH = 'tests/utils.v1.yaml';
const harness = useTestServer(CONTRACT_PATH);

let server;

beforeAll(async () => {
    await harness.setup();
    server = harness.getServer();
});

afterAll(async () => {
    await harness.teardown();
});

/* ================================================================== */
/* GET /health                                                        */
/* ================================================================== */

describe('GET /health', () => {
    it('returns Healthy status', async () => {
        const res = await server.inject({
            method: 'GET',
            url: '/v1/health'
        });

        expect(res.statusCode).toBe(200);
        expect(res.json()).toEqual({ status: 'Healthy' });
    });
});

/* ================================================================== */
/* GET /metrics                                                       */
/* ================================================================== */

describe('GET /metrics', () => {
    it('returns prometheus-style metrics', async () => {
        const res = await server.inject({
            method: 'GET',
            url: '/v1/metrics'
        });

        expect(res.statusCode).toBe(200);

        const body = res.payload;
        expect(body).toContain('http_requests_total');
        expect(body).toContain('process_resident_memory_bytes');
    });
});

/* ================================================================== */
/* GET /orchestration-actions                                         */
/* ================================================================== */

describe('GET /orchestration-actions', () => {
    it('returns registered orchestration actions', async () => {
        const res = await server.inject({
            method: 'GET',
            url: '/v1/orchestration-actions'
        });

        expect(res.statusCode).toBe(200);

        const body = res.json();
        expect(Array.isArray(body)).toBe(true);
        expect(body.length).toBeGreaterThan(0);

        const action = body[0];
        expect(action).toHaveProperty('name');
        expect(action).toHaveProperty('description');
        expect(action).toHaveProperty('params');
        expect(Array.isArray(action.params)).toBe(true);
    });
});

/* ================================================================== */
/* GET /ready                                                         */
/* ================================================================== */

describe('GET /ready', () => {
    it('returns Ready status', async () => {
        const res = await server.inject({
            method: 'GET',
            url: '/v1/ready'
        });

        expect(res.statusCode).toBe(200);
        expect(res.json()).toEqual({ status: 'Ready' });
    });
});
