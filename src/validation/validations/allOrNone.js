import { dataError, definitionError, present } from '../_helpers.js';

export function allOrNone({ params, body }) {
    const fields = params?.fields;
    if (!Array.isArray(fields) || fields.length === 0) {
        return definitionError(undefined, "allOrNone expects 'fields' (non-empty array)");
    }

    // Dot-path support.
    const get = (path) => {
        const parts = String(path).split('.').filter(Boolean);
        let cur = body;
        for (const p of parts) cur = cur?.[p];
        return cur;
    };

    const presentCount = fields.filter(f => present(get(f))).length;

    if (presentCount !== 0 && presentCount !== fields.length) {
        return dataError(
            fields.join(','),
            `Either all or none of [${fields.join(', ')}] must be present`
        );
    }
    return [];
}
