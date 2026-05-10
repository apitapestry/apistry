import { validate } from 'postal-codes-js';
import { dataError, definitionError, present, resolveOperand } from '../_helpers.js';

export function postalCodeCountry({ value, property, params, body }) {
    // Not responsible for requiredness.
    if (!present(value)) return [];
    if (typeof value !== 'string') return [];

    if (typeof params?.countryField !== 'string' || params.countryField.trim() === '') {
        return definitionError(property, "postalCodeCountry expects 'countryField' (string)");
    }

    const c = resolveOperand({ params: { field: params.countryField }, body });
    const country = c.value;
    if (!present(country) || typeof country !== 'string') {
        return definitionError(property, `postalCodeCountry could not resolve country from '${params.countryField}'`);
    }

    if (!validate(country, value)) {
        return dataError(property, `Postal code not valid for country ${country}`, value);
    }

    return [];
}
