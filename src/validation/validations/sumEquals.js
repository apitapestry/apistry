import { dataError, definitionError, present } from '../_helpers.js';

export function sumEquals({ value, property, params }) {
    if (!Array.isArray(value)) return [];

    if (typeof params?.field !== 'string' || params.field.trim() === '' || !present(params?.equals)) {
        return definitionError(property, "sumEquals expects 'field' (string) and 'equals' (number)");
    }
    const eq = Number(params.equals);
    if (!Number.isFinite(eq)) {
        return definitionError(property, "sumEquals 'equals' must be a finite number");
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

    if (sum !== eq) {
        return dataError(property, `Sum must equal ${eq}`, sum);
    }
    return [];
}
