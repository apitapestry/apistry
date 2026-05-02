import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { useTestServer } from './server.js';

const CONTRACT_PATH = 'tests/cars.v1.yaml';
const harness = useTestServer(CONTRACT_PATH);

let server;
let carId;

beforeAll(async () => {
    await harness.setup();
    server = harness.getServer();
});

afterAll(async () => {
    await harness.teardown();
});

/* ================================================================== */
/* INIT: POST /cars — seed database                                   */
/* ================================================================== */

describe('INIT /cars (seed database)', () => {
    it('creates initial car record required for subresource tests', async () => {
        const res = await server.inject({
            method: 'POST',
            url: '/v1/cars',
            payload: {
                vin: '1HGBH41JXMN109186',
                make: 'Chevy',
                model: 'Silverado',
                modelYear: 2023,
                price: 28500.0,
                color: 'Testing',
                mileage: 99999,
                carStatus: 'available',
                bodyType: 'sedan',
                transmission: 'automatic',
                fuelType: 'hybrid',
                engine: '2.5L 4-Cylinder',
                driveType: 'fwd',
                doors: 4,
                seats: 5,
                features: [
                    'Backup Camera',
                    'Bluetooth',
                    'Cruise Control',
                    'Leather Seats'
                ],
                events: [
                    {
                        eventDate: '2025-02-02',
                        eventType: 'Maintenance',
                        description: 'Oil Change'
                    },
                    {
                        eventDate: '2025-04-02',
                        eventType: 'Accident',
                        description: 'Passenger front panel'
                    }
                ],
                description: 'Well-maintained, single owner, complete service history',
                images: [
                    'https://example.com/images/car1.jpg',
                    'https://example.com/images/car2.jpg'
                ]
            }
        });

        expect(res.statusCode).toBe(201);

        const body = res.json();
        expect(body.results).toHaveLength(1);

        carId = body.results[0].carId;
        expect(carId).toBeDefined();
    });
});

/* ================================================================== */
/* GET /cars/:id/features                                             */
/* ================================================================== */

describe('GET /cars/:id/features', () => {
    it('returns feature list', async () => {
        const res = await server.inject({
            method: 'GET',
            url: `/v1/cars/${carId}/features`
        });

        expect(res.statusCode).toBe(200);
        expect(res.json()[0]).toBe('Backup Camera');
        expect(res.json().length).toBeGreaterThan(0);
    });
});

/* ================================================================== */
/* GET /cars/:id/features/:feature                                    */
/* ================================================================== */

describe('GET /cars/:id/features/:feature', () => {
    it('returns a single feature as text', async () => {
        const res = await server.inject({
            method: 'GET',
            url: `/v1/cars/${carId}/features/Bluetooth`
        });

        expect(res.statusCode).toBe(200);
        expect(res.payload).toBe('Bluetooth');

        const ct = res.headers['content-type'];
        if (ct) {
            expect(ct).toContain('text/plain');
        }
    });
});

/* ================================================================== */
/* GET /cars/:id/features (regex)                                     */
/* ================================================================== */

describe('GET /cars/:id/features?feature=*c*c*', () => {
    it('filters features by wildcard', async () => {
        const res = await server.inject({
            method: 'GET',
            url: `/v1/cars/${carId}/features?feature=*c*c*`
        });

        expect(res.statusCode).toBe(200);
        expect(res.json()[0]).toBe('Backup Camera');
        expect(res.json().length).toBe(2);
    });
});

/* ================================================================== */
/* POST /cars/:id/features (single)                                   */
/* ================================================================== */

describe('POST /cars/:id/features (single)', () => {
    it('adds a single feature', async () => {
        const res = await server.inject({
            method: 'POST',
            url: `/v1/cars/${carId}/features`,
            headers: { 'content-type': 'application/json' },
            payload: ['New Feature']
        });

        expect(res.statusCode).toBe(201);
        expect(res.json()).toContain('New Feature');
        expect(res.json().length).toBe(5);
    });
});

/* ================================================================== */
/* POST /cars/:id/features (bulk)                                     */
/* ================================================================== */

describe('POST /cars/:id/features (bulk)', () => {
    it('adds multiple features', async () => {
        const res = await server.inject({
            method: 'POST',
            url: `/v1/cars/${carId}/features`,
            payload: ['Something', 'Something Else']
        });

        expect(res.statusCode).toBe(201);
        expect(res.json()).toContain('Something');
        expect(res.json().length).toBe(7);
    });
});

/* ================================================================== */
/* PUT /cars/:id/features                                             */
/* ================================================================== */

describe('PUT /cars/:id/features', () => {
    it('is not implemented', async () => {
        const res = await server.inject({
            method: 'PUT',
            url: `/v1/cars/${carId}/features`,
            payload: ['Something', 'Something Else']
        });

        expect(res.statusCode).toBe(501);
        expect(res.json().error).toBe('not_implemented');
    });
});

/* ================================================================== */
/* DELETE /cars/:id/features (query)                                  */
/* ================================================================== */

describe('DELETE /cars/:id/features?feature=Something*', () => {
    it('removes matching features', async () => {
        const res = await server.inject({
            method: 'DELETE',
            url: `/v1/cars/${carId}/features?feature=Something*`
        });

        expect(res.statusCode).toBe(200);
        expect(res.json()[0]).toBe('Backup Camera');
        expect(res.json()).toContain('New Feature');
        expect(res.json().length).toBe(5);
    });
});

/* ================================================================== */
/* DELETE /cars/:id/features/:feature                                 */
/* ================================================================== */

describe('DELETE /cars/:id/features/:feature', () => {
    it('removes a single feature', async () => {
        const res = await server.inject({
            method: 'DELETE',
            url: `/v1/cars/${carId}/features/New Feature`
        });

        expect(res.statusCode).toBe(200);
        expect(res.json()).not.toContain('New Feature');
        expect(res.json().length).toBe(4);
    });
});

/* ================================================================== */
/* PATCH /cars/:id/features/:feature                                  */
/* ================================================================== */

describe('PATCH /cars/:id/features/:feature', () => {
    it('updates a feature value', async () => {
        const res = await server.inject({
            method: 'PATCH',
            url: `/v1/cars/${carId}/features/Bluetooth`,
            headers: { 'content-type': 'application/json' },
            payload: '"bluetooth"'
        });

        expect(res.statusCode).toBe(200);
        expect(res.json()).toContain('bluetooth');
        expect(res.json().length).toBe(4);
    });
});
