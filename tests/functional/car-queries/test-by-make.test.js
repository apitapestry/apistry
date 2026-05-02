import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getCars } from './_utils.js';
import { harness } from './harness.js';

// Test GET /cars?make=Toyota
// Test GET /cars?make=eq.Toyota
// Test GET /cars?make=neq.Toyota
// Test GET /cars?make=in.Toyota,Honda
// Test GET /cars?make=nin.Ford
// Test GET /cars?make=*oyot*
// Test GET /cars?make=isNull
// Test GET /cars?make=isNotNull

describe('Car Queries: make filter', () => {
  beforeAll(async () => {
    await harness.setup();
  });

  afterAll(async () => {
    await harness.teardown();
  });

  it('should return only Toyota cars', async () => {
    const res = await getCars({ make: 'Toyota' });
    expect(res.status).toBe(200);
    expect(res.results.every(car => car.make === 'Toyota')).toBe(true);
  });

  it('should return only non-Toyota cars', async () => {
    const res = await getCars({ make: 'neq.Toyota' });
    expect(res.status).toBe(200);
    expect(res.results.every(car => car.make !== 'Toyota')).toBe(true);
  });

  it('should return cars with make in [Toyota, Honda]', async () => {
    const res = await getCars({ make: 'in.Toyota,Honda' });
    expect(res.status).toBe(200);
    expect(res.results.every(car => [ 'Toyota', 'Honda' ].includes(car.make))).toBe(true);
  });

  it('should return cars with make not in [Ford]', async () => {
    const res = await getCars({ make: 'nin.Ford' });
    expect(res.status).toBe(200);
    expect(res.results.every(car => car.make !== 'Ford')).toBe(true);
  });

  it('should return cars with make matching wildcard', async () => {
    const res = await getCars({ make: '*oyot*' });
    expect(res.status).toBe(200);
    expect(res.results.every(car => /oyot/i.test(car.make))).toBe(true);
  });

  it('should return cars with null make', async () => {
    const res = await getCars({ make: 'isNull' });
    expect(res.status).toBe(200);
    expect(res.results.every(car => car.make == null)).toBe(true);
  });

  it('should return cars with non-null make', async () => {
    const res = await getCars({ make: 'isNotNull' });
    expect(res.status).toBe(200);
    expect(res.results.every(car => car.make != null)).toBe(true);
  });
});
