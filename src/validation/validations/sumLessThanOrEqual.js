import { fail } from '../_helpers.js';
import { dataError, definitionError, present } from '../_helpers.js';

export function sumLessThanOrEqual({ value, property, params }) {
    if (!Array.isArray(value)) return [];

    if (typeof params?.field !== 'string' || params.field.trim() === '' || !present(params?.max)) {
        return definitionError(property, "sumLessThanOrEqual expects 'field' (string) and 'max' (number)");
    }
    const max = Number(params.max);
    if (!Number.isFinite(max)) {
        return definitionError(property, "sumLessThanOrEqual 'max' must be a finite number");
    }

    let sum = 0;
    for (const item of value) {
        const raw = item?.[params.field];
        const n = raw === undefined || raw === null ? 0 : Number(raw);
        if (!Number.isFinite(n)) {
            return dataError(property, `Invalid number at '${params.field}'`, raw);
        }
        sum += n;
    }

    if (sum > max) {
        return dataError(property, `Sum must not exceed ${max}`, sum);
    }
    return [];
}
