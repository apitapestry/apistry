import { dataError, definitionError, present, resolveOperand } from '../_helpers.js';

export function forbids({ value, property, params, body }) {
    // Not responsible for requiredness.
    if (!present(value)) return [];

    const rhs = resolveOperand({ params, body });
    if (rhs.source !== 'field') {
        return definitionError(property, "forbids expects 'field' parameter");
    }

    if (rhs.present) {
        return dataError(property, `Must not be used with '${rhs.path}'`, value);
    }

    return [];
}
