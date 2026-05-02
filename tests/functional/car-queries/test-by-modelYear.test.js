import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getCars } from './_utils.js';
import { harness } from './harness.js';

describe('Car Queries: modelYear filter', () => {
  beforeAll(async () => {
    await harness.setup();
  });

  afterAll(async () => {
    await harness.teardown();
  });

  it('should return cars with modelYear = 2023', async () => {
    const res = await getCars({ modelYear: 2023 });
    expect(res.status).toBe(200);
    expect(res.results.every(car => car.modelYear === 2023)).toBe(true);
  });

  it('should return cars with modelYear > 2010', async () => {
    const res = await getCars({ modelYear: 'gt.2010' });
    expect(res.status).toBe(200);
    expect(res.results.every(car => car.modelYear > 2010)).toBe(true);
  });

  it('should return cars with modelYear between 2015 and 2020 (inclusive)', async () => {
    const res = await getCars({ modelYear: 'between.2015,2020' });
    expect(res.status).toBe(200);
    expect(res.results.every(car => car.modelYear >= 2015 && car.modelYear <= 2020)).toBe(true);
  });
});
