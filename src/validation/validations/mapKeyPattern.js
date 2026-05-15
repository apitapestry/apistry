import { dataError, definitionError, present } from '../_helpers.js';

export function mapKeyPattern({ value, property, params = {} }) {
    if (!present(value) || typeof value !== 'object' || Array.isArray(value)) {
        return [];
    }

    const { pattern } = params;
    if (!pattern) {
        return definitionError(property, 'mapKeyPattern requires a regex pattern');
    }

    let regex;
    try {
        regex = new RegExp(pattern);
    } catch {
        return definitionError(property, `Invalid regex pattern: ${pattern}`);
    }

    for (const key of Object.keys(value)) {
        if (!regex.test(key)) {
            return dataError(property, `Map key '${key}' does not match required pattern`, key);
        }
    }

    return [];
}
