import { describe, it, expect, vi } from 'vitest';
import extractStage from '../../src/commands/etl/etlExtract.js';

describe('ETL Extract - harry-potter pagination', () => {
  it('should fetch all pages using harry-potter pagination strategy', async () => {
    // Mock fetch to simulate paginated API
    const pages = [
      {
        data: [{ id: 1 }, { id: 2 }],
        links: { next: 'http://api/potter?page[number]=2' }
      },
      {
        data: [{ id: 3 }, { id: 4 }],
        links: { next: null }
      }
    ];
    let fetchCall = 0;
    const mockFetch = vi.fn(async (url) => {
      const page = pages[fetchCall++];
      return {
        ok: true,
        json: async () => page
      };
    });

    const config = {
      'output-path': './tmp',
      'naming-strategy': '{resource}.json',
      'pagination-strategy': 'harry-potter',
      actions: [
        { resource: 'test', url: 'http://api/potter' }
      ]
    };
    const log = { info: vi.fn() };
    await extractStage(config, true, log, mockFetch); // dryRun, inject mock fetch
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
