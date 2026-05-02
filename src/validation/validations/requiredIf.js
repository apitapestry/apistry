import { dataError, definitionError, present } from '../_helpers.js';

export function requiredIf({ value, property, params, body }) {
    // Not responsible for requiredness.
    if (!present(value)) return [];

    if (!Array.isArray(params?.values) || !Array.isArray(params?.required)) {
        return definitionError(property, "requiredIf expects 'values' (array) and 'required' (array)");
    }

    if (params.values.includes(value)) {
        for (const p of params.required) {
            if (typeof p !== 'string' || p.trim() === '') {
                return definitionError(property, "requiredIf 'required' entries must be non-empty strings");
            }
            // Dot-path support for nested required fields.
            const parts = p.split('.').filter(Boolean);
            let cur = body;
            for (const part of parts) {
                cur = cur?.[part];
            }
            if (!present(cur)) {
                return dataError(property, `Requires ${p} when value is ${value}`, value);
            }
        }
    }
    return [];
}
