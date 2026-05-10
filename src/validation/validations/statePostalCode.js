import { validate } from 'postal-codes-js';
import { createRequire } from 'node:module';
import { dataError, definitionError, present, resolveOperand } from '../_helpers.js';

const require = createRequire(import.meta.url);
const ZIP_STATE_PREFIX = require('./statePostalCode.json');

export function statePostalCode({ value, property, params = {}, body }) {
    // Not responsible for requiredness.
    if (!present(value)) return [];
    if (typeof value !== 'string') return [];

    if (typeof params?.stateField !== 'string' || params.stateField.trim() === '') {
        return definitionError(property, "statePostalCode expects 'stateField' (string)");
    }

    const op = resolveOperand({ params: { field: params.stateField }, body });
    const state = op.value;
    if (!present(state) || typeof state !== 'string') {
        return definitionError(property, `statePostalCode could not resolve state from '${params.stateField}'`);
    }

    // Step 1: validate US ZIP format
    if (!validate('US', value)) {
        return dataError(property, 'Invalid US postal code', value);
    }

    // Step 2: plausibility check for state
    const prefix = value.slice(0, 3);
    if (!ZIP_STATE_PREFIX[state]?.includes(prefix)) {
        return dataError(property, `Postal code not plausible for state ${state}`, value);
    }

    return [];
}
