import { JSONPath } from 'jsonpath-plus';
import { dataError, definitionError, externalHttpDependencyError } from '../_helpers.js';

// todo: update config.yml - figure out valid use case for cars
// todo: add logic to cache external source configs
// todo: validate contracts at startup - ensure this is not used if no licence
// todo: if this is valid use - make sure services are defined in config

export async function httpCheck({
  httpCheck,
  request, // incoming API request (body, query, headers)
  service // resolved external service descriptor (injected by runtime)
}) {
  // Follow the canonical validator contract: return [] or [..errors], never throw.

  if (!service) {
    return definitionError(undefined, 'Missing resolved external service descriptor');
  }

  const { request: reqSpec, response: resSpec, assertThat } = httpCheck ?? {};

  if (!reqSpec?.method || !reqSpec?.path) {
    return definitionError(undefined, 'httpCheck.request.method and httpCheck.request.path are required');
  }

  if (!resSpec?.bind) {
    return definitionError(undefined, 'Missing response.bind');
  }

  // 1) Bind request values
  const bindResult = bindValues(reqSpec.bind, request, { required: true, label: 'request.bind' });
  if (bindResult.errors.length > 0) return bindResult.errors;

  // 2) Build outbound request
  const outbound = buildOutboundRequest({
    service,
    reqSpec,
    bindings: bindResult.bindings
  });
  if (outbound.errors.length > 0) return outbound.errors;

  // 3) Execute HTTP call (with retries)
  const attemptLimit = Number.isInteger(service.retries) ? service.retries + 1 : 1; // retries means additional attempts
  let response;

  for (let attempt = 1; attempt <= attemptLimit; attempt++) {
    try {
      response = await fetchWithTimeout(outbound.url, outbound.options, service.timeoutMs);

      // Retry on upstream 5xx only (dependency failure)
      if (response.status >= 500 && response.status <= 599) {
        if (attempt < attemptLimit) {
          continue;
        }
        return externalHttpDependencyError(undefined, `External dependency returned ${response.status}`);
      }

      // Non-5xx is successful from a dependency-reachability standpoint.
      break;
    } catch (err) {
      if (attempt < attemptLimit) {
        continue;
      }
      return externalHttpDependencyError(undefined, 'External dependency unreachable: ' + service.name, err);
    }
  }

  // 4) Parse response JSON
  let responseBody;
  try {
    const text = await response.text();
    responseBody = text ? JSON.parse(text) : {};
  } catch {
    return externalHttpDependencyError(undefined, 'External dependency returned a non-JSON response');
  }

  // 5) Bind response values
  const bindingContext = {
    $response: {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: responseBody
    }
  };

  const responseBindResult = bindValues(resSpec.bind, bindingContext, { required: true, label: 'response.bind' });
  if (responseBindResult.errors.length > 0) return responseBindResult.errors;

  // 6) Assertions
  const assertions = normalizeAssertThat(assertThat);
  if (assertions.errors.length > 0) return assertions.errors;

  return evaluateAssertions(assertions.assertions, responseBindResult.bindings, bindResult.bindings);
}

function bindValues(bindSpec, sourceObject, { required = false, label = 'bind' } = {}) {
  if (!bindSpec || Object.keys(bindSpec).length === 0) {
    if (required) {
      return { bindings: {}, errors: definitionError(undefined, `Missing or empty ${label}`) };
    }
    return { bindings: {}, errors: [] };
  }

  const bound = {};
  const errors = [];

  for (const [name, jsonPath] of Object.entries(bindSpec)) {
    const result = JSONPath({ path: jsonPath, json: sourceObject });

    if (result.length === 0) {
      errors.push(...dataError(undefined, `Binding failed for '${name}'`));
      continue;
    }

    bound[name] = result[0];
  }

  return { bindings: bound, errors };
}

function buildOutboundRequest({ service, reqSpec, bindings }) {
  const method = reqSpec.method;
  if (!['GET', 'POST'].includes(method)) {
    return { url: '', options: {}, errors: definitionError(undefined, `Unsupported HTTP method: ${method}`) };
  }

  let path = reqSpec.path;
  for (const [key, value] of Object.entries(bindings)) {
    path = path.replace(`{${key}}`, encodeURIComponent(value));
  }

  const url = `${service.baseUrl}${path}`;

  const headersResult = buildHeaders(service);
  if (headersResult.errors.length > 0) {
    return { url: '', options: {}, errors: headersResult.errors };
  }

  const options = {
    method,
    headers: headersResult.headers
  };

  if (method === 'POST') {
    options.headers['Content-Type'] = 'application/json';
    const bodyResult = resolveBody(reqSpec.body, bindings);
    if (bodyResult.errors.length > 0) {
      return { url: '', options: {}, errors: bodyResult.errors };
    }
    options.body = JSON.stringify(bodyResult.body);
  }

  return { url, options, errors: [] };
}

function buildHeaders(service) {
  const headers = {};

  const auth = service?.auth;
  if (!auth) return { headers, errors: [] };

  if (auth.type === 'bearer') {
    if (!auth.token) {
      return { headers: {}, errors: definitionError(undefined, 'Missing bearer token for external source auth') };
    }
    headers.Authorization = `Bearer ${auth.token}`;
    return { headers, errors: [] };
  }

  if (auth.type === 'apiKey') {
    if (!auth.header) {
      return { headers: {}, errors: definitionError(undefined, 'apiKey auth requires auth.header') };
    }
    if (!auth.value) {
      return { headers: {}, errors: definitionError(undefined, 'Missing apiKey value for external source auth') };
    }
    headers[auth.header] = auth.value;
    return { headers, errors: [] };
  }

  return { headers: {}, errors: definitionError(undefined, `Unsupported external source auth type: ${auth.type}`) };
}

function resolveBody(bodySpec = {}, bindings) {
  const body = {};

  if (!bodySpec) return { body: {}, errors: [] };

  for (const [key, template] of Object.entries(bodySpec || {})) {
    if (typeof template !== 'string' || !template.startsWith('{') || !template.endsWith('}')) {
      return { body: {}, errors: definitionError(undefined, `Invalid body template: ${template}`) };
    }

    const bindingName = template.slice(1, -1);
    if (!(bindingName in bindings)) {
      return { body: {}, errors: dataError(undefined, `Unknown binding '${bindingName}' in body`) };
    }

    body[key] = bindings[bindingName];
  }

  return { body, errors: [] };
}

function normalizeAssertThat(assertThat) {
  if (!assertThat) {
    return { assertions: [], errors: definitionError(undefined, 'Missing assertThat for httpCheck (required when response.bind is used)') };
  }

  const assertions = Array.isArray(assertThat) ? assertThat : (Array.isArray(assertThat.all) ? assertThat.all : null);
  if (!assertions) {
    return { assertions: [], errors: definitionError(undefined, 'Invalid assertThat format; expected an array or { all: [...] }') };
  }

  // Enforce: assertThat entries may ONLY use `value`, not `valueFrom`.
  for (const a of assertions) {
    if (a && typeof a === 'object' && typeof a.valueFrom === 'string' && a.valueFrom.trim() !== '') {
      return { assertions: [], errors: definitionError(undefined, 'httpCheck.assertThat does not support valueFrom; use value with request.bind references or literals') };
    }
  }

  return { assertions, errors: [] };
}

function resolveAssertionValue({ value }, requestBindings) {
  // Allowed:
  // - literal values (number/boolean/object/etc)
  // - string reference to a request.bind key: "reqMake" (preferred) or "{reqMake}" (also supported)
  if (typeof value === 'string') {
    const trimmed = value.trim();
    const m = trimmed.match(/^\{(.+)}$/);
    const key = m ? m[1].trim() : trimmed;

    // If the string exactly matches a request.bind key, treat it as a binding reference.
    if (key in (requestBindings ?? {})) {
      return { ok: true, value: requestBindings[key] };
    }

    // Otherwise treat it as a literal string.
    return { ok: true, value };
  }

  return { ok: true, value };
}

function evaluateAssertions(assertions = [], responseBindings, requestBindings) {
  const failures = [];

  for (const assertion of assertions) {
    const { property, operator, value } = assertion;

    if (!property) {
      failures.push(...definitionError(undefined, 'assertThat entries must include "property"'));
      continue;
    }

    if (!(property in responseBindings)) {
      failures.push(...definitionError(undefined, `Unknown property '${property}'`));
      continue;
    }

    const responseValue = responseBindings[property];

    const expectedRes = resolveAssertionValue({ value }, requestBindings);
    if (!expectedRes.ok) {
      failures.push(...expectedRes.error);
      continue;
    }

    const expectedValue = expectedRes.value;

    // Evaluate response (actual) against expected (literal or request.bind reference)
    const evalRes = evaluate(responseValue, operator, expectedValue);
    if (!evalRes.ok) {
      failures.push(...evalRes.error);
      continue;
    }

    if (!evalRes.passed) {
      const rejectedStr = stringifyRejectedValue(expectedValue);
      const expectedQuoted = stringifyQuoted(expectedValue);
      const actualQuoted = stringifyQuoted(responseValue);

      const message = operator === 'equalsIgnoreCase'
        ? `Assertion failed: expected ${expectedQuoted} ${operator} ${actualQuoted}`
        : `Assertion failed: ${expectedQuoted} ${operator} ${actualQuoted}`;

      failures.push(...dataError(property, message, rejectedStr));
    }
  }

  return failures;
}

function stringifyRejectedValue(v) {
  // validateRequest will String() rejectedValue again, but many validators already pass strings.
  // Keep this conservative and stable.
  if (v === undefined) return undefined;
  if (v === null) return 'null';
  if (typeof v === 'string') return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function looksNumeric(v) {
  if (v === undefined || v === null) return false;
  const s = String(v).trim();
  return s !== '' && /^-?\d+(\.\d+)?$/.test(s);
}

function evaluate(actual, operator, expected) {
  if (!operator || typeof operator !== 'string') {
    return { ok: false, error: definitionError(undefined, 'assertThat entries must include "operator"') };
  }

  switch (operator) {
    case 'equals': {
      // If both sides are numeric-ish, compare numerically to avoid "2007" vs 2007 mismatches.
      if (looksNumeric(actual) && looksNumeric(expected)) {
        return { ok: true, passed: Number(actual) === Number(expected) };
      }
      return { ok: true, passed: actual === expected };
    }
    case 'equalsIgnoreCase': {
      const a = actual === undefined || actual === null ? '' : String(actual);
      const b = expected === undefined || expected === null ? '' : String(expected);
      return { ok: true, passed: a.toLowerCase() === b.toLowerCase() };
    }
    case '<':
      return { ok: true, passed: actual < expected };
    case '<=':
      return { ok: true, passed: actual <= expected };
    case '>':
      return { ok: true, passed: actual > expected };
    case '>=':
      return { ok: true, passed: actual >= expected };
    case 'in':
      return { ok: true, passed: Array.isArray(expected) && expected.includes(actual) };
    case 'between':
      return { ok: true, passed: actual >= expected.min && actual <= expected.max };
    case 'contains': {
      if (expected === undefined || expected === null) {
        return { ok: false, error: definitionError(undefined, 'contains operator requires a non-null expected value') };
      }
      const expectedStr = String(expected);
      const actualStr = actual === undefined || actual === null ? '' : String(actual);
      return { ok: true, passed: actualStr.includes(expectedStr) };
    }
    case 'notContains': {
      if (expected === undefined || expected === null) {
        return { ok: false, error: definitionError(undefined, 'notContains operator requires a non-null expected value') };
      }
      const expectedStr = String(expected);
      const actualStr = actual === undefined || actual === null ? '' : String(actual);
      return { ok: true, passed: !actualStr.includes(expectedStr) };
    }
    default:
      return { ok: false, error: definitionError(undefined, `Unsupported operator: ${operator}`) };
  }
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(new Error('fetch_timeout')), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

function stringifyQuoted(v) {
  // Always single-quote the rendered value for stable, readable error messages.
  if (v === undefined) return "'undefined'";
  if (v === null) return "'null'";
  if (typeof v === 'string') return `'${v}'`;
  try {
    return `'${JSON.stringify(v)}'`;
  } catch {
    return `'${String(v)}'`;
  }
}
