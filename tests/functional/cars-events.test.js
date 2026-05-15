import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { useTestServer } from './server.js';

const CONTRACT_PATH = 'tests/cars.v1.yaml';
const harness = useTestServer(CONTRACT_PATH);

let server;
let carId;
let eventId;
let eventId2;

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
/* POST /cars/:id/events (single)                                     */
/* ================================================================== */

describe('POST /cars/:id/events (single)', () => {
    it('creates one event', async () => {
        const res = await server.inject({
            method: 'POST',
            url: `/v1/cars/${carId}/events`,
            payload: {
                eventDate: '2025-02-02',
                eventType: 'Maintenance',
                description: 'Oil Change'
            }
        });

        expect(res.statusCode).toBe(201);
        expect(Array.isArray(res.json())).toBe(true);

        res.json().forEach(e => {
            expect(e).toHaveProperty('eventId');
            expect(e).toHaveProperty('eventDate');
            expect(e).toHaveProperty('eventType');
            expect(e).toHaveProperty('description');
        });
    });
});

/* ================================================================== */
/* POST /cars/:id/events (bulk)                                       */
/* ================================================================== */

describe('POST /cars/:id/events (bulk)', () => {
    it('creates multiple events', async () => {
        const res = await server.inject({
            method: 'POST',
            url: `/v1/cars/${carId}/events`,
            payload: [
                {
                    eventDate: '2025-02-02',
                    eventType: 'Accident',
                    description: 'Passenger front panel'
                },
                {
                    eventDate: '2025-04-02',
                    eventType: 'Maintenance',
                    description: 'Fix Handle'
                }
            ]
        });

        expect(res.statusCode).toBe(201);
        expect(res.body).contains('Fix Handle');
        expect(res.json().length).toBe(5);
    });
});

/* ================================================================== */
/* GET /cars/:id/events                                               */
/* ================================================================== */

describe('GET /cars/:id/events', () => {
    it('returns all events', async () => {
        const res = await server.inject({
            method: 'GET',
            url: `/v1/cars/${carId}/events`
        });

        expect(res.statusCode).toBe(200);
        expect(res.body).contains('Fix Handle');
        expect(res.json().length).toBe(5);

        eventId = res.json()[0].eventId;
        eventId2 = res.json()[1].eventId;
    });
});

/* ================================================================== */
/* PATCH /cars/:id/events/:eventId                                    */
/* ================================================================== */

describe('PATCH /cars/:id/events/:eventId', () => {
    it('updates a single event and removes description', async () => {
        const res = await server.inject({
            method: 'PATCH',
            url: `/v1/cars/${carId}/events/${eventId}`,
            payload: {
                eventId,
                eventDate: '2024-02-02',
                eventType: 'Maintenance - Update',
                description: null
            }
        });

        expect(res.statusCode).toBe(200);
        expect(res.body).contains('Maintenance - Update');
        expect(res.json().length).toBe(5);
        expect(res.json()[0]).not.toHaveProperty('description');
    });
});

/* ================================================================== */
/* PATCH /cars/:id/events (bulk)                                      */
/* ================================================================== */

describe('PATCH /cars/:id/events (bulk)', () => {
    it('updates multiple events', async () => {
        const res = await server.inject({
            method: 'PATCH',
            url: `/v1/cars/${carId}/events`,
            payload: [
                {
                    eventId,
                    eventDate: '2023-01-01',
                    eventType: 'Test Updates 1',
                    description: 'Test Updates 1'
                },
                {
                    eventId: eventId2,
                    eventDate: '2025-01-01',
                    eventType: 'Test Updates 2',
                    description: 'Test Updates 2'
                }
            ]
        });

        expect(res.statusCode).toBe(200);
        expect(res.body).contains('Test Updates 1');
        expect(res.body).contains('Test Updates 2');
        expect(res.json().length).toBe(5);
    });
});

/* ================================================================== */
/* DELETE /cars/:id/events/:eventId                                   */
/* ================================================================== */

describe('DELETE /cars/:id/events/:eventId', () => {
    it('deletes a single event', async () => {
        const res = await server.inject({
            method: 'DELETE',
            url: `/v1/cars/${carId}/events/${eventId}`
        });

        expect(res.statusCode).toBe(200);
        expect(res.json().length).toBe(4);
        expect(res.json().some(e => e.eventId === eventId)).toBe(false);
    });
});

/* ================================================================== */
/* DELETE /cars/:id/events (query)                                    */
/* ================================================================== */

describe('DELETE /cars/:id/events?eventDate=gt.1900-01-01', () => {
    it('deletes all events', async () => {
        const res = await server.inject({
            method: 'DELETE',
            url: `/v1/cars/${carId}/events?eventDate=gt.1900-01-01`
        });

        expect(res.statusCode).toBe(200);
        expect(res.json().length).toBe(0);
    });
});

/* ================================================================== */
/* PUT /cars/:id/events                                               */
/* ================================================================== */

describe('PUT /cars/:id/events', () => {
    it('is not implemented', async () => {
        const res = await server.inject({
            method: 'PUT',
            url: `/v1/cars/${carId}/events`,
            payload: [
                {
                    eventDate: '2025-02-02',
                    eventType: 'Accident',
                    description: 'Passenger front panel'
                }
            ]
        });

        expect(res.statusCode).toBe(501);
        expect(res.json().error).toBe('not_implemented');
    });
});
