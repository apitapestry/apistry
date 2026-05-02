import { dataError, present } from '../_helpers.js';

export function whiteSpaceOnly({ value, property }) {
    if (!present(value)) return [];
    if (typeof value === 'string' && value.trim() === '') {
        return dataError(property, 'Must not be whitespace only', value);
    }
    return [];
}
