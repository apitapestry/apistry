import luhn from 'fast-luhn';
import { dataError, present } from '../_helpers.js';

export function validChecksum({ value, property }) {
    if (!present(value)) return [];
    if (typeof value !== 'string') return [];

    if (!luhn(value)) {
        return dataError(property, 'Invalid checksum', value);
    }

    return [];
}
