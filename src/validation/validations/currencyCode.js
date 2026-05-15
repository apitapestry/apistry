import currencyCodes from 'currency-codes';
import { dataError, present } from '../_helpers.js';

export function currencyCode({ value, property }) {
    if (!present(value)) return [];
    if (typeof value !== 'string') return [];

    if (!currencyCodes.code(value)) {
        return dataError(property, 'Invalid ISO 4217 currency code', value);
    }

    return [];
}
