import { dataError, definitionError } from '../_helpers.js';

export function uniqueBy({ value, property, params }) {
    if (!Array.isArray(value)) return [];

    if (typeof params?.field !== 'string' || params.field.trim() === '') {
        return definitionError(property, "uniqueBy expects 'field' (string)");
    }

    const seen = new Set();
    for (const item of value) {
        const key = item?.[params.field];
        if (seen.has(key)) {
            return dataError(property, `Elements must be unique by '${params.field}'`, value);
        }
        seen.add(key);
    }
    return [];
}
