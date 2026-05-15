import { dataError, present } from '../_helpers.js';

export function noSqlInjectionMongo({ value, property, params = {} }) {
    if (!present(value)) return [];
    if (typeof value !== 'string') return [];

    // Disallow common Mongo operators
    const forbidden = [
        '$ne',
        '$gt',
        '$gte',
        '$lt',
        '$lte',
        '$in',
        '$nin',
        '$or',
        '$and',
        '$where'
    ];

    // Normalization must be explicit and parameter-driven.
    const caseInsensitive = params.caseInsensitive === true;
    const candidate = caseInsensitive ? value.toLowerCase() : value;

    for (const op of forbidden) {
        const needle = caseInsensitive ? op.toLowerCase() : op;
        if (candidate.includes(needle)) {
            return dataError(property, 'Potential MongoDB operator injection detected', value);
        }
    }

    // Disallow JSON-like object strings
    if (/^\s*\{.*}\s*$/.test(value)) {
        return dataError(property, 'Object-like input not allowed', value);
    }

    return [];
}
