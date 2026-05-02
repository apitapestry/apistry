import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { useTestServer } from './server.js';

const CONTRACT_PATH = 'tests/cars.v1.yaml';
const harness = useTestServer(CONTRACT_PATH);

let server;
let carId;
let carId2;

beforeAll(async () => {
    await harness.setup();
    server = harness.getServer();
});

afterAll(async () => {
    await harness.teardown();
});

/* ================================================================== */
/* DELETE /cars (hard delete)                                         */
/* ================================================================== */

describe('DELETE /cars?color=Testing', () => {
    it('hard deletes testing cars', async () => {
        const res = await server.inject({
            method: 'DELETE',
            url: '/v1/cars?color=Testing'
        });

        expect(res.statusCode).toBe(200);
    });
});

/* ================================================================== */
/* POST /cars (bulk)                                                  */
/* ================================================================== */

describe('POST /cars (bulk)', () => {
    it('creates multiple cars', async () => {
        const res = await server.inject({
            method: 'POST',
            url: '/v1/cars',
            payload: [
                {
                    vin: '1HGBH41JXMN109186',
                    make: 'Toyota',
                    model: 'Camry',
                    modelYear: 2023,
                    color: 'Testing',
                    mileage: 99999,
                    price: 28500,
                    status: 'available'
                },
                {
                    vin: '2HGCM82633A004352',
                    make: 'Honda',
                    model: 'Accord',
                    modelYear: 2022,
                    color: 'Testing',
                    mileage: 99999,
                    price: 26500,
                    status: 'sold'
                },
                {
                    vin: '3FA6P0K98HR123456',
                    make: 'Ford',
                    model: 'Fusion',
                    modelYear: 2021,
                    color: 'Testing',
                    mileage: 99999,
                    price: 21000,
                    status: 'available'
                }
            ]
        });

        expect(res.statusCode).toBe(201);
        expect(res.json().results).toHaveLength(3);
    });
});

/* ================================================================== */
/* POST /cars (single)                                                */
/* ================================================================== */

describe('POST /cars (single)', () => {
    it('creates a single car', async () => {
        const res = await server.inject({
            method: 'POST',
            url: '/v1/cars',
            payload: {
                "vin": "1HGBH41JXMN109186",
                "make": "Chevy",
                "model": "Silverado",
                "modelYear": 2023,
                "price": 50000,
                "color": "Testing",
                "mileage": 99,
                "carStatus": "deleted",
                "bodyType": "sedan",
                "transmission": "automatic",
                "fuelType": "hybrid",
                "engine": "2.5L 4-Cylinder",
                "driveType": "fwd",
                "doors": 4,
                "seats": 5,
                "features": [
                    "Backup Camera",
                    "Bluetooth",
                    "Cruise Control",
                    "Leather Seats"
                ],
                "events": [
                    {
                        "eventDate": "2025-04-02",
                        "eventType": "Maintenance",
                        "description": "Fix Handle"
                    },
                    {
                        "eventDate": "2025-02-02",
                        "eventType": "Accident",
                        "description": "Passenger front panel"
                    }
                ],
                "description": "Well-maintained, single owner, complete service history",
                "images": [
                    "https://example.com/images/car1.jpg",
                    "https://example.com/images/car2.jpg"
                ]
            }
        });

        expect(res.statusCode).toBe(201);
    });
});

/* ================================================================== */
/* GET /cars                                                          */
/* ================================================================== */

describe('GET /cars', () => {
    it('returns testing cars', async () => {
        const res = await server.inject({
            method: 'GET',
            url: '/v1/cars?color=Testing&limit=7'
        });

        expect(res.statusCode).toBe(200);

        const body = res.json();
        expect(body.results.length).toBeGreaterThan(0);

        carId = body.results[0].carId;
        carId2 = body.results[1].carId;
    });
});

/* ================================================================== */
/* GET /cars/:id                                                      */
/* ================================================================== */

describe('GET /cars/:id', () => {
    it('returns a single car', async () => {
        const res = await server.inject({
            method: 'GET',
            url: `/v1/cars/${carId}`
        });

        expect(res.statusCode).toBe(200);
    });
});

/* ================================================================== */
/* PATCH /cars/:id                                                    */
/* ================================================================== */

describe('PATCH /cars/:id', () => {
    it('updates a car', async () => {
        const res = await server.inject({
            method: 'PATCH',
            url: `/v1/cars/${carId}`,
            payload: {
                mileage: null,
                price: 50000
            }
        });

        expect(res.statusCode).toBe(200);
        expect(res.json()).not.toHaveProperty('mileage');
    });
});

/* ================================================================== */
/* PATCH /cars (bulk)                                                 */
/* ================================================================== */

describe('PATCH /cars (bulk)', () => {
    it('updates multiple cars', async () => {
        const res = await server.inject({
            method: 'PATCH',
            url: '/v1/cars',
            payload: [
                { carId, mileage: 99 },
                { carId: carId2, mileage: 99 }
            ]
        });

        expect(res.statusCode).toBe(200);
    });
});

/* ================================================================== */
/* DELETE /cars/:id                                                   */
/* ================================================================== */

describe('DELETE /cars/:id', () => {
    it('soft deletes a car', async () => {
        const res = await server.inject({
            method: 'DELETE',
            url: `/v1/cars/${carId}`
        });

        expect(res.statusCode).toBe(200);
        expect(res.json().carStatus).toBe('deleted');
    });
});

/* ================================================================== */
/* DELETE /cars with unknown query params                              */
/* ================================================================== */

describe('DELETE /cars with unknown query params', () => {
    it('returns 422 and identifies the invalid parameter', async () => {
        const res = await server.inject({
            method: 'DELETE',
            url: '/v1/cars?color=Testing&bogus=1'
        });

        expect(res.statusCode).toBe(422);
        expect(res.json()).toEqual([
            {
                objectName: 'querystring',
                property: 'bogus',
                rejectedValue: '1',
                message: "Query parameter 'bogus' is not valid"
            }
        ]);
    });
});

/* ================================================================== */
/* GET /cars with unknown query params                                 */
/* ================================================================== */

describe('GET /cars with unknown query params', () => {
    it('returns 422 and identifies the invalid parameter', async () => {
        const res = await server.inject({
            method: 'GET',
            url: '/v1/cars?color=Testing&limit=7&bogus=1'
        });

        expect(res.statusCode).toBe(422);
        expect(res.json()).toEqual([
            {
                objectName: 'querystring',
                property: 'bogus',
                rejectedValue: '1',
                message: "Query parameter 'bogus' is not valid"
            }
        ]);
    });
});
