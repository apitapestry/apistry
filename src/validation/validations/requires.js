import { dataError, definitionError, present, resolveOperand } from '../_helpers.js';

export function requires({ value, property, params, body }) {
    // Not responsible for requiredness.
    if (!present(value)) return [];

    const rhs = resolveOperand({ params, body });
    if (rhs.source !== 'field') {
        return definitionError(property, "requires expects 'field' parameter");
    }

    if (!rhs.present) {
        return dataError(property, `Requires '${rhs.path}' to be present`, value);
    }

    return [];
}
