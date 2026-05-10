// Utility for car queries tests
// Usage: await getCars({ make: 'Toyota', modelYear: 'gte.2015' })

import { harness } from './harness.js';

export async function getCars(query = {}) {
  // Build query string from object
  const params = Object.entries(query)
    .flatMap(([key, value]) => Array.isArray(value) ? value.map(v => `${key}=${encodeURIComponent(v)}`) : `${key}=${encodeURIComponent(value)}`)
    .join('&');
  const url = `/v1/cars${params ? '?' + params : ''}`;
  const res = await harness.getServer().inject({ method: 'GET', url });
  return {
    status: res.statusCode,
    results: res.json().results || [],
    raw: res
  };
}
