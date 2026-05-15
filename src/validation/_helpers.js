/**
 * Apistry Validation Error Model (Internal Documentation)
 *
 * Invariants:
 * - All validation failures (data, contract/definition) map to HTTP 422. Validators must NOT choose status codes.
 * - HTTP 500 is reserved ONLY for outbound HTTP dependency failures (network/infrastructure or upstream 5xx).
 * - The public 422 error shape, field names, structure, and message semantics MUST NOT change.
 * - Validators must use only these shared utilities for error construction and operand resolution.
 * - Internal error kinds (data, definition, external dependency) are for mapping and diagnostics only; they do NOT alter the public error payload.
 * - No validator may introduce new error fields visible to consumers, nor change error semantics.
 *
 * This file enforces these invariants and centralizes error handling and operand resolution.
 */

export function present(v) {
    return v !== undefined && v !== null;
}

/**
 * Canonical Apistry validation error model.
 *
 * IMPORTANT invariant:
 * - All validation failures (including contract/definition errors) map to HTTP 422.
 * - HTTP 500 is reserved ONLY for outbound HTTP dependency failures (network/infrastructure or upstream 5xx).
 *
 * Validators MUST NOT choose HTTP status codes. They return errors with a `type`, and status mapping
 * is enforced centrally in `runValidationRule()`.
 */
function validationError({ type, property, description, rejectedValue, details, cause }) {
    return [{
        type,
        property,
        description,
        rejectedValue,
        details,
        cause
    }];
}

/**
 * Data validation failure (HTTP 422).
 */
export function dataError(property, description, rejectedValue) {
    return validationError({ type: 'data', property, description, rejectedValue });
}

/**
 * Contract/definition error (still HTTP 422).
 */
export function definitionError(property, description, details) {
    return validationError({ type: 'definition', property, description, details });
}

/**
 * Outbound HTTP dependency failure.
 *
 * This is the ONLY error type that may map to HTTP 500, and only when the failure is due to
 * network/infrastructure issues or upstream 5xx.
 */
export function externalHttpDependencyError(property, description, cause, details) {
    return validationError({ type: 'external_http_dependency', property, description, cause, details });
}

// Note: `externalHttpDependencyError()` may be unused in a given build if no validators perform
// outbound HTTP calls. It remains part of the canonical error model to enforce the invariant that
// HTTP 500 is only possible for unreachable external HTTP dependencies.

export function fail(property, description, rejectedValue) {
    // Backward-compatible alias for dataError.
    return dataError(property, description, rejectedValue);
}

/**
 * Resolve a parameter that may be provided as a literal value or as a field reference.
 *
 * Rules:
 * - Prefer `params.field` when present (string). Field paths are dot-delimited.
 * - Otherwise use `params.value` literal.
 * - Missing operands are returned as { present: false }.
 * - This utility does not coerce or normalize; validators must do schema-driven coercion as needed.
 */
export function resolveOperand({ params = {}, body = {} } = {}) {
    if (typeof params.field === 'string' && params.field.trim() !== '') {
        const path = params.field.trim();
        const value = getByPath(body, path);
        return { source: 'field', path, value, present: present(value) };
    }

    if (Object.prototype.hasOwnProperty.call(params, 'value')) {
        return { source: 'value', value: params.value, present: present(params.value) };
    }

    return { source: 'none', value: undefined, present: false };
}

function getByPath(obj, path) {
    if (!obj || typeof obj !== 'object') return undefined;
    const parts = path.split('.').filter(Boolean);
    let cur = obj;
    for (const p of parts) {
        if (!cur || typeof cur !== 'object') return undefined;
        cur = cur[p];
    }
    return cur;
}
