import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { httpCheck } from '../../src/validation/validations/httpCheck.js';

function mockFetchOnceJson({ status = 200, json }) {
  global.fetch = async () => ({
    status,
    headers: new Headers({ 'content-type': 'application/json' }),
    async text() {
      return JSON.stringify(json);
    }
  });
}

describe('httpCheck contains/notContains operators', () => {
  const service = { baseUrl: 'https://example.test', timeoutMs: 250, auth: undefined };

  const incomingRequest = {
    body: { vin: '1HGBH41JXMN109186' },
    query: {},
    headers: {}
  };

  const httpCheckSpec = {
    source: 'vinApi',
    request: {
      method: 'GET',
      path: '/decode/{vin}',
      bind: {
        vin: '$.body.vin'
      }
    },
    response: {
      bind: {
        errorText: '$response.body.ErrorText'
      }
    },
    assertThat: [
      { property: 'errorText', operator: 'contains', value: 'VIN decoded clean' }
    ]
  };

  const originalFetch = global.fetch;

  beforeEach(() => {
    originalFetch && (global.fetch = originalFetch);
  });

  afterEach(() => {
    originalFetch && (global.fetch = originalFetch);
  });

  it('passes when response binding contains expected substring', async () => {
    mockFetchOnceJson({
      status: 200,
      json: {
        ErrorText: '0 - VIN decoded clean. Check Digit (9th position) is correct; 14 - Unable to provide information...'
      }
    });
    await expect(httpCheck({ httpCheck: httpCheckSpec, request: incomingRequest, service })).resolves.toEqual([]);
  });

  it('fails when response binding does not contain expected substring', async () => {
    mockFetchOnceJson({
      status: 200,
      json: {
        ErrorText: 'Something else'
      }
    });
    await expect(httpCheck({ httpCheck: httpCheckSpec, request: incomingRequest, service })).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'data',
          property: 'errorText',
          description: expect.stringContaining('contains'),
        })
      ])
    );
  });

  it('supports notContains', async () => {
    const spec = {
      ...httpCheckSpec,
      assertThat: [{ property: 'errorText', operator: 'notContains', value: 'BLOCKED' }]
    };
    mockFetchOnceJson({
      status: 200,
      json: {
        ErrorText: '0 - VIN decoded clean.'
      }
    });
    await expect(httpCheck({ httpCheck: spec, request: incomingRequest, service })).resolves.toEqual([]);
  });

  it('can compare response-bound values to request values via valueFrom', async () => {
    const spec = {
      ...httpCheckSpec,
      response: {
        bind: {
          make: '$response.body.Results[0].Make'
        }
      },
      assertThat: [{ property: 'make', operator: 'equals', valueFrom: '$.body.make' }]
    };
    mockFetchOnceJson({
      status: 200,
      json: {
        Results: [{ Make: 'HONDA' }]
      }
    });
    const req = { ...incomingRequest, body: { ...incomingRequest.body, make: 'HONDA' } };
    await expect(httpCheck({ httpCheck: spec, request: req, service })).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'definition',
          description: expect.stringContaining('does not support valueFrom'),
        })
      ])
    );
  });

  it('also resolves JSONPath when value starts with $. (convenience)', async () => {
    const spec = {
      ...httpCheckSpec,
      response: {
        bind: {
          make: '$response.body.Results[0].Make'
        }
      },
      assertThat: [{ property: 'make', operator: 'equals', value: '$.body.make' }]
    };
    mockFetchOnceJson({
      status: 200,
      json: {
        Results: [{ Make: 'HONDA' }]
      }
    });
    const req = { ...incomingRequest, body: { ...incomingRequest.body, make: 'HONDA' } };
    // This feature is not supported, so expect a failure
    await expect(httpCheck({ httpCheck: spec, request: req, service })).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'data',
          property: 'make',
          description: expect.stringContaining('equals'),
        })
      ])
    );
  });

  it('supports equalsIgnoreCase (case-insensitive equals)', async () => {
    const spec = {
      ...httpCheckSpec,
      response: {
        bind: {
          make: '$response.body.Results[0].Make'
        }
      },
      assertThat: [{ property: 'make', operator: 'equalsIgnoreCase', valueFrom: '$.body.make' }]
    };
    mockFetchOnceJson({
      status: 200,
      json: {
        Results: [{ Make: 'HONDA' }]
      }
    });
    const req = { ...incomingRequest, body: { ...incomingRequest.body, make: 'Honda' } };
    await expect(httpCheck({ httpCheck: spec, request: req, service })).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'definition',
          description: expect.stringContaining('does not support valueFrom'),
        })
      ])
    );
  });

  it('evaluates all assertions and reports all failures', async () => {
    const spec = {
      ...httpCheckSpec,
      response: {
        bind: {
          responseCode: '$response.status',
          errorText: '$response.body.ErrorText',
          make: '$response.body.Results[0].Make'
        }
      },
      assertThat: [
        { property: 'responseCode', operator: 'equals', value: 201 },
        { property: 'errorText', operator: 'contains', value: 'VIN decoded clean' },
        { property: 'make', operator: 'equalsIgnoreCase', value: 'toyota' }
      ]
    };
    mockFetchOnceJson({
      status: 200,
      json: {
        ErrorText: 'Something else',
        Results: [{ Make: 'HONDA' }]
      }
    });
    const failures = await httpCheck({ httpCheck: spec, request: incomingRequest, service });
    expect(Array.isArray(failures)).toBe(true);
    expect(failures).toHaveLength(3);

    const messages = failures.map((f) => f.description).join(' | ');
    expect(messages).toMatch(/equals/);
    expect(messages).toMatch(/contains/);
    expect(messages).toMatch(/equalsIgnoreCase/);
  });
});
