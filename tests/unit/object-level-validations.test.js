import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateRequest } from '../../src/validation/validateRequest.js';

// Note: validateRequest throws UnprocessableEntityError on failures.

describe('validateRequest supports x-validations at object level and property level', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = originalFetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('runs object-level httpCheck on the root schema (httpCheck is object-level only)', async () => {
    const fetchSpy = vi.fn(async () => ({
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      async text() {
        return JSON.stringify({ ok: true });
      }
    }));
    global.fetch = fetchSpy;

    const schema = {
      type: 'object',
      'x-validations': [
        {
          httpCheck: {
            source: 'someService',
            request: {
              method: 'GET',
              path: '/ok',
              bind: { any: '$.body.any' }
            },
            response: {
              bind: { responseCode: '$response.status' }
            },
            assertThat: [{ property: 'responseCode', operator: 'equals', value: 200 }]
          }
        }
      ],
      properties: {
        any: { type: 'string' }
      }
    };

    const externalServices = {
      assertService: () => ({ baseUrl: 'https://example.test', timeoutMs: 250, auth: undefined })
    };
    // Touch the function so static analyzers don't flag it as unused in this test context.
    expect(typeof externalServices.assertService).toBe('function');

    await expect(
      validateRequest({ schema, body: { any: 'x' }, intent: 'insert', externalServices, request: { body: { any: 'x' }, query: {}, headers: {} } })
    ).resolves.toBeUndefined();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('runs property-level validations on a field', async () => {
    const schema = {
      type: 'object',
      properties: {
        a: {
          type: 'string',
          'x-validations': [{ function: 'whiteSpaceOnly', parameters: {} }]
        }
      }
    };

    await expect(
      validateRequest({ schema, body: { a: '   ' }, intent: 'insert', externalServices: {}, request: {} })
    ).rejects.toMatchObject({ name: 'UnprocessableEntityError' });
  });

  it('rejects httpCheck when declared at property level', async () => {
    const schema = {
      type: 'object',
      properties: {
        a: {
          type: 'string',
          'x-validations': [
            {
              httpCheck: {
                source: 'someService',
                request: { method: 'GET', path: '/ok', bind: { any: '$.body.any' } },
                response: { bind: { responseCode: '$response.status' } },
                assertThat: [{ property: 'responseCode', operator: 'equals', value: 200 }]
              }
            }
          ]
        }
      }
    };

    await expect(
      validateRequest({ schema, body: { a: 'x' }, intent: 'insert', externalServices: {}, request: {} })
    ).rejects.toMatchObject({ name: 'UnprocessableEntityError' });
  });
});
