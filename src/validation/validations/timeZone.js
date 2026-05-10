import { dataError, present } from '../_helpers.js';

export function timeZone({ value, property }) {
    if (!present(value)) return [];
    if (typeof value !== 'string') return [];

    try {
        Intl.DateTimeFormat(undefined, { timeZone: value });
        return [];
    } catch {
        return dataError(property, 'Invalid IANA time zone', value);
    }
}
