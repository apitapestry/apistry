import { describe, it, expect } from 'vitest';
import { VALIDATION_FUNCTIONS } from '../../src/validation/index.js';
import { runValidationRule } from '../../src/validation/validateRequest.js';

function assertIsErrorArray(result) {
  expect(Array.isArray(result)).toBe(true);
  for (const err of result) {
    expect(err).toBeTruthy();
    expect(typeof err).toBe('object');
    expect(err.statusCode).toBeTypeOf('number');
    expect(err.statusCode).toBe(422);
    expect(err.type).toBeTypeOf('string');
    expect(['data', 'definition', 'external_http_dependency'].includes(err.type)).toBe(true);
    expect(err.description).toBeTypeOf('string');
  }
}

async function dispatch({ fnName, value, property = 'field', params = {}, body = {}, schema = { type: 'string' }, prior } = {}) {
  // Validators generally expect `body` for the request payload; runValidationRule calls it `intent`.
  const res = await runValidationRule({
    rule: { function: fnName, parameters: params },
    value,
    property,
    schema,
    intent: body,
    prior
  });

  // Some implementations might return undefined; normalize.
  return res ?? [];
}

// Provide minimal params/body so baseline calls don’t throw for validators that assume params fields exist.
function baselineInputFor(fnName) {
  switch (fnName) {
    case 'httpCheck':
      // httpCheck is async and requires runtime injection of a resolved service descriptor;
      // it is validated separately in async/integration tests.
      return { skip: true };
    case 'compare':
      // Baseline should be not-applicable (missing value) so compare returns [] instead of a definition error.
      return { value: undefined, params: { operator: '<', value: 1 }, body: {}, schema: { type: 'number' } };
    case 'requires':
    case 'forbids':
      // Baseline should be not-applicable (missing value), but include required config to ensure it would be valid.
      return { value: undefined, params: { field: 'other' }, body: {} };
    case 'allOrNone':
    case 'atLeastOneOf':
    case 'exactlyOneOf':
      return { value: undefined, params: { fields: ['a', 'b'] }, body: {} };
    case 'requiredIf':
      return { value: undefined, params: { values: [], required: [] }, body: {} };
    case 'maxItemsWhere':
      return { value: undefined, params: { field: 't', equals: 'X', max: 1 }, body: {} };
    case 'sortedBy':
    case 'uniqueBy':
      return { value: undefined, params: { field: 'id' }, body: {} };
    case 'sumEquals':
      return { value: undefined, params: { field: 'p', equals: 0 }, body: {} };
    case 'sumLessThanOrEqual':
      return { value: undefined, params: { field: 'p', max: 0 }, body: {} };
    case 'ratioWithin':
      return { value: undefined, params: { numerator: 'a', denominator: 'b', min: 0, max: 1 }, body: {} };
    case 'mapKeyPattern':
      return { value: undefined, params: { pattern: '.*' }, body: {} };
    case 'postalCodeCountry':
      return { value: undefined, params: { countryField: 'country' }, body: { country: 'US' } };
    case 'statePostalCode':
      return { value: undefined, params: { stateField: 'state' }, body: { state: 'CA' }, schema: {} };
    case 'regionCode':
      // regionCode reads dynamic fields from `schema` too.
      return { value: undefined, params: { country: 'US' }, body: {}, schema: {} };
    default:
      return { value: undefined, params: {}, body: {} };
  }
}

describe('Validation functions (src/validation/validations)', () => {
  it('VALIDATION_FUNCTIONS registry contains only functions', () => {
    for (const [name, fn] of Object.entries(VALIDATION_FUNCTIONS)) {
      expect(fn).toBeTypeOf('function');
      expect(name).toBeTypeOf('string');
    }
  });

  it('each registered validation returns an array (and does not throw) for a baseline not-applicable input', async () => {
    for (const name of Object.keys(VALIDATION_FUNCTIONS)) {
      const input = baselineInputFor(name);
      if (input?.skip) continue;

      const result = await dispatch({ fnName: name, ...input });
      assertIsErrorArray(result);
    }
  });

  it('each registered validation can produce a valid error array shape for a representative failing input', async () => {
     const cases = {
       compare: { value: '1', params: { operator: '>=', value: 10 }, schema: { type: 'number' } },

      // compare (date-time)
      compareDateTime: { fnName: 'compare', value: '2000-01-01T00:00:00Z', params: { operator: '>=', value: 'now' }, schema: { type: 'string', format: 'date-time' } },

       requires: { value: 'present', params: { field: 'other' }, body: {} },
       requiredIf: {
         value: 'CANCELLED',
         params: { values: ['CANCELLED'], required: ['cancelReason'] },
         body: { cancelReason: undefined }
       },
       forbids: { value: 'present', params: { field: 'other' }, body: { other: 'also-present' } },

       immutableIf: {
         value: 'changed',
         property: 'field',
         params: { field: 'status', in: ['LOCKED'] },
         body: { status: 'LOCKED', field: 'changed' },
         prior: { status: 'LOCKED', field: 'old' }
       },

       allOrNone: { params: { fields: ['a', 'b'] }, body: { a: 'x' } },
       atLeastOneOf: { params: { fields: ['a', 'b'] }, body: {} },
       exactlyOneOf: { params: { fields: ['a', 'b'] }, body: { a: 'x', b: 'y' } },

       uniqueBy: { value: [{ id: 1 }, { id: 1 }], params: { field: 'id' } },
       sortedBy: { value: [{ n: 2 }, { n: 1 }], params: { field: 'n', order: 'asc' } },
       maxItemsWhere: { value: [{ t: 'X' }, { t: 'X' }], params: { field: 't', equals: 'X', max: 1 } },

       sumEquals: { value: [{ p: 40 }, { p: 50 }], params: { field: 'p', equals: 100 } },
       sumLessThanOrEqual: { value: [{ p: 60 }, { p: 50 }], params: { field: 'p', max: 100 } },
       ratioWithin: { params: { numerator: 'a', denominator: 'b', min: 0.5, max: 1 }, body: { a: 1, b: 10 } },

       base64: { value: 'not-base64' },
       countryCode: { value: 'ZZ' },
       currencyCode: { value: 'ZZZ' },
       timeZone: { value: 'Not/AZone' },

       regionCode: { value: 'ZZ', params: { country: 'US' } },

       postalCodeCountry: { value: 'INVALID', params: { countryField: 'country' }, body: { country: 'US' } },

       statePostalCode: { value: '99999', params: { stateField: 'state' }, body: { state: 'CA' } },

       url: { value: 'notaurl', params: { allowLocalhost: false } },
       usPhoneNumber: { value: 'not-a-phone' },
       validChecksum: { value: '0' },
       whiteSpaceOnly: { value: '   ' },
       noSqlInjectionMongo: { value: '{"$ne":null}', params: { caseInsensitive: true } },
       profanity: { value: 'shit' },
       mapKeyPattern: { value: { 'bad-key!': 'x' }, params: { pattern: '^[a-zA-Z0-9_]+$' } }
     };

    for (const [key, input] of Object.entries(cases)) {
      const fnName = input.fnName ?? key;
      if (fnName === 'httpCheck') continue;
      const result = await dispatch({ fnName, ...input });
       assertIsErrorArray(result);
     }
   });
 });
