import { dataError, present } from '../_helpers.js';

function isLoopback(host) {
    return host === 'localhost' || host === '127.0.0.1' || host === '::1';
}

export function url({ value, property, params }) {
    if (!present(value)) return [];
    if (typeof value !== 'string') return [];

    let parsed;
    try {
        parsed = new URL(value);
    } catch {
        return dataError(property, 'Must be a valid absolute URL', value);
    }

    if (!params?.allowLocalhost && isLoopback(parsed.hostname)) {
        return dataError(property, 'Localhost URLs are not allowed', value);
    }

    return [];
}
