import { dataError, definitionError } from '../_helpers.js';

export function immutableIf({ value, property, params = {}, body, prior }) {
    if (!prior) return [];

    if (typeof params?.field !== 'string' || params.field.trim() === '' || !Array.isArray(params?.in)) {
        return definitionError(property, "immutableIf expects 'field' (string) and 'in' (array)");
    }

    const state = body?.[params.field];
    if (!params.in?.includes(state)) return [];

    // ---- Property-level immutability ----
    if (property) {
        if (value !== prior[property]) {
            return dataError(property, `Field is immutable when ${params.field} is ${state}`, value);
        }
        return [];
    }

    // ---- Object-level immutability ----
    // Shallow comparison is enough because:
    // - sub-resources are validated separately
    // - persistence boundary already flattened intent
    for (const key of Object.keys(body)) {
        if (body[key] !== prior[key]) {
            return dataError(key, `Object is immutable when ${params.field} is ${state}`, body[key]);
        }
    }

    return [];
}
