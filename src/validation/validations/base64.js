import { dataError, present } from '../_helpers.js';

export function base64({ value, property }) {
    if (!present(value)) return [];
    if (typeof value !== 'string') return [];

    const re = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
    if (!re.test(value)) {
        return dataError(property, 'Must be valid base64', value);
    }
    return [];
}
