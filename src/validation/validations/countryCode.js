import countries from 'i18n-iso-countries';
import { createRequire } from 'node:module';
import { dataError, present } from '../_helpers.js';

const require = createRequire(import.meta.url);
// `i18n-iso-countries` ships locale data as JSON; using `require` avoids Node's
// import-attributes requirement for JSON modules.
const en = require('i18n-iso-countries/langs/en.json');

countries.registerLocale(en);

export function countryCode({ value, property }) {
    if (!present(value)) return [];
    if (typeof value !== 'string') return [];

    if (!countries.isValid(value)) {
        return dataError(property, 'Invalid ISO 3166-1 alpha-2 country code', value);
    }

    return [];
}
