import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { dataError, present } from '../_helpers.js';

export function usPhoneNumber({ value, property }) {
    if (!present(value)) return [];
    if (typeof value !== 'string') return [];

    const phone = parsePhoneNumberFromString(value);

    if (!phone || !phone.isPossible() || !phone.isValid()) {
        return dataError(property, 'Invalid E.164 phone number', value);
    }

    if (phone.number !== value) {
        return dataError(property, 'Phone number must be canonical E.164 format', value);
    }

    return [];
}
