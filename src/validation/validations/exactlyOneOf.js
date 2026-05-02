import { dataError, definitionError, present } from '../_helpers.js';

export function exactlyOneOf({ params, body }) {
    const fields = params?.fields;
    if (!Array.isArray(fields) || fields.length === 0) {
        return definitionError(undefined, "exactlyOneOf expects 'fields' (non-empty array)");
    }

    const get = (path) => {
        const parts = String(path).split('.').filter(Boolean);
        let cur = body;
        for (const p of parts) cur = cur?.[p];
        return cur;
    };

    const count = fields.filter(f => present(get(f))).length;

    if (count !== 1) {
        return dataError(
            fields.join(','),
            `Exactly one of [${fields.join(', ')}] must be present`
        );
    }
    return [];
}
