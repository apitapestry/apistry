import { dataError, definitionError, present } from '../_helpers.js';

export function atLeastOneOf({ params, body }) {
    const fields = params?.fields;
    if (!Array.isArray(fields) || fields.length === 0) {
        return definitionError(undefined, "atLeastOneOf expects 'fields' (non-empty array)");
    }

    const get = (path) => {
        const parts = String(path).split('.').filter(Boolean);
        let cur = body;
        for (const p of parts) cur = cur?.[p];
        return cur;
    };

    if (!fields.some(f => present(get(f)))) {
        return dataError(
            fields.join(','),
            `At least one of [${fields.join(', ')}] must be present`
        );
    }
    return [];
}
