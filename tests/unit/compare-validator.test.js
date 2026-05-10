import { describe, it, expect } from 'vitest';
import { runValidationRule } from '../../src/validation/validateRequest.js';

async function dispatch({ value, params = {}, body = {}, schema, property = 'field' }) {
  return (await runValidationRule({
    rule: { function: 'compare', parameters: params },
    value,
    property,
    schema,
    intent: body
  })) ?? [];
}

function expectFail(res) {
  expect(Array.isArray(res)).toBe(true);
  expect(res.length).toBeGreaterThan(0);
  expect(res[0].statusCode).toBeTypeOf('number');
  expect(res[0].description).toBeTypeOf('string');
}

describe('compare validator', () => {
  it('number: coerces numeric strings and compares', async () => {
    expect(await dispatch({
      value: '9',
      params: { operator: '>=', value: 10 },
      schema: { type: 'number' }
    })).not.toEqual([]);

    expect(await dispatch({
      value: '10',
      params: { operator: '>=', value: 10 },
      schema: { type: 'number' }
    })).toEqual([]);
  });

  it('number: fails if coercion fails', async () => {
    expectFail(await dispatch({
      value: 'not-a-number',
      params: { operator: '>=', value: 10 },
      schema: { type: 'number' }
    }));
  });

  it('date-time: supports now tokens (case-insensitive) and truncation', async () => {
    const nowIso = new Date().toISOString();

    // now: should be >= now(day) (since truncation rounds down)
    expect(await dispatch({
      value: nowIso,
      params: { operator: '>=', value: 'now(day)' },
      schema: { type: 'string', format: 'date-time' }
    })).toEqual([]);

    // Future date should be > now(year) for most cases
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    expect(await dispatch({
      value: future,
      params: { operator: '>', value: 'Now(year)' },
      schema: { type: 'string', format: 'date-time' }
    })).toEqual([]);
  });

  it('date-time: in operator requires array and coerces elements', async () => {
    const a = '2020-01-01T00:00:00Z';
    const b = '2021-01-01T00:00:00Z';

    expectFail(await dispatch({
      value: a,
      params: { operator: 'in', value: b },
      schema: { type: 'string', format: 'date-time' }
    }));

    expect((await dispatch({
      value: a,
      params: { operator: 'in', value: [b] },
      schema: { type: 'string', format: 'date-time' }
    })).length).toBeGreaterThan(0);

    expect(await dispatch({
      value: a,
      params: { operator: 'in', value: [a, b] },
      schema: { type: 'string', format: 'date-time' }
    })).toEqual([]);
  });

  it('number: between supports [min,max] and {min,max}', async () => {
    expect((await dispatch({
      value: 10,
      params: { operator: 'between', value: [12, 14] },
      schema: { type: 'number' }
    })).length).toBeGreaterThan(0);

    expect(await dispatch({
      value: 13,
      params: { operator: 'between', value: [12, 14] },
      schema: { type: 'number' }
    })).toEqual([]);

    expect(await dispatch({
      value: 13,
      params: { operator: 'between', value: { min: 12, max: 14 } },
      schema: { type: 'number' }
    })).toEqual([]);
  });

  it('string without supported format is rejected (definition-time style error)', async () => {
    const res = await dispatch({
      value: 'abc',
      params: { operator: '=', value: 'abc' },
      schema: { type: 'string' }
    });
    expect(res[0].type).toBe('definition');
    expect(res[0].statusCode).toBe(422);
  });

  it('supports not-equal operators (!= and <>)', async () => {
    // number
    expect((await dispatch({
      value: 10,
      params: { operator: '!=', value: 10 },
      schema: { type: 'number' }
    })).length).toBeGreaterThan(0);

    expect(await dispatch({
      value: 10,
      params: { operator: '<>', value: 11 },
      schema: { type: 'number' }
    })).toEqual([]);

    // date-time
    const a = '2020-01-01T00:00:00Z';
    const b = '2021-01-01T00:00:00Z';
    expect((await dispatch({
      value: a,
      params: { operator: '!=', value: a },
      schema: { type: 'string', format: 'date-time' }
    })).length).toBeGreaterThan(0);

    expect(await dispatch({
      value: a,
      params: { operator: '<>', value: b },
      schema: { type: 'string', format: 'date-time' }
    })).toEqual([]);
  });

  it('missing right-hand operand is a definition error', async () => {
    const res = await dispatch({
      value: 1,
      params: { operator: '>=' },
      schema: { type: 'number' }
    });
    expect(res.length).toBeGreaterThan(0);
    expect(res[0].type).toBe('definition');
    expect(res[0].statusCode).toBe(422);
  });

  it('date: supports now offsets like now-18y (useful for age checks)', async () => {
    const schema = { type: 'string', format: 'date' };

    // Someone born 19 years ago should pass "<= now-18y"
    const born19yAgo = new Date();
    born19yAgo.setFullYear(born19yAgo.getFullYear() - 19);

    expect(await dispatch({
      value: born19yAgo.toISOString().slice(0, 10),
      params: { operator: '<=', value: 'now-18y' },
      schema
    })).toEqual([]);

    // Someone born 17 years ago should fail "<= now-18y"
    const born17yAgo = new Date();
    born17yAgo.setFullYear(born17yAgo.getFullYear() - 17);

    const res = await dispatch({
      value: born17yAgo.toISOString().slice(0, 10),
      params: { operator: '<=', value: 'now-18y' },
      schema
    });

    expectFail(res);
    // Ensure the RHS is rendered as a friendly label, not a raw timestamp.
    expect(res[0].description).toContain('now-18y');
  });

  it('date-time: supports month offsets like now-2mo', async () => {
    const schema = { type: 'string', format: 'date-time' };

    // A timestamp from 1 month ago should be >= now-2mo
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    expect(await dispatch({
      value: oneMonthAgo.toISOString(),
      params: { operator: '>=', value: 'now-2mo' },
      schema
    })).toEqual([]);

    // A timestamp from 3 months ago should fail >= now-2mo
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    expectFail(await dispatch({
      value: threeMonthsAgo.toISOString(),
      params: { operator: '>=', value: 'now-2mo' },
      schema
    }));
  });

  it('integer: supports now(year) tokens with year offsets (modelYear style checks)', async () => {
    const schema = { type: 'integer' };
    const thisYear = new Date().getFullYear();

    // within range: between (thisYear-50) and (thisYear+1)
    expect(await dispatch({
      value: thisYear,
      params: { operator: '>=', value: 'now(year)-50y' },
      schema,
      property: 'year'
    })).toEqual([]);

    expect(await dispatch({
      value: thisYear,
      params: { operator: '<=', value: 'now(year)+1y' },
      schema,
      property: 'year'
    })).toEqual([]);

    // too old
    const resOld = await dispatch({
      value: thisYear - 51,
      params: { operator: '>=', value: 'now(year)-50y' },
      schema,
      property: 'year'
    });
    expectFail(resOld);

    // too far in future
    const resFuture = await dispatch({
      value: thisYear + 2,
      params: { operator: '<=', value: 'now(year)+1y' },
      schema,
      property: 'year'
    });
    expectFail(resFuture);
  });
});
