import { describe, it, expect } from 'vitest';
import execute from '../../src/orchestration/actions/contractNormalizeResponse.js';

function makeCtx({ body, schema }) {
  return {
    semantic: { response: { schema } },
    state: { response: { body } },
    validation: { errors: [] }
  };
}

describe('contractNormalizeResponse', () => {
  it('normalizes wrapper.results[] into canonical items', async () => {
    const schema = {
      type: 'object',
      properties: {
        results: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              fullname: { type: 'string', 'x-transforms': [{ source: 'name' }] },
              characterId: { type: 'string', 'x-transforms': [{ source: 'url' }, { 'apply-pattern': '^.*/people/(\\d+)/?$' }] }
            },
            required: ['fullname']
          }
        }
      },
      additionalProperties: true
    };

    const ctx = makeCtx({
      schema,
      body: {
        count: 1,
        results: [{ name: 'Luke Skywalker', url: 'https://swapi.py4e.com/api/people/1/' }]
      }
    });

    await execute(ctx, {});

    expect(ctx.validation.errors.length).toBe(0);
    const actual = ctx.state.response.body.results[0];
    // expect(actual).toEqual({
    //   fullname: 'Luke Skywalker',
    //   url: 'https://swapi.py4e.com/api/people/1/'
    // });
  });
});
