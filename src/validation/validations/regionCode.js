import CountriesImport from 'i18n-iso-countries';
import { dataError, definitionError, present, resolveOperand } from '../_helpers.js';

const countries = CountriesImport?.default ?? CountriesImport;

function getSubdivisionsSafe(country) {
    const fn = countries?.getSubdivisions ?? countries?.subdivisions?.getSubdivisions;
    return typeof fn === 'function' ? fn(country) : undefined;
}

export function regionCode({ value, property, params = {}, body }) {
    // Not responsible for requiredness.
    if (!present(value)) return [];
    if (typeof value !== 'string') return [];

    let resolvedCountry = params?.country;

    if (!resolvedCountry && typeof params?.countryField === 'string' && params.countryField.trim() !== '') {
        const op = resolveOperand({ params: { field: params.countryField }, body });
        resolvedCountry = op.value;
    }

    if (!resolvedCountry) {
        return definitionError(property, "regionCode requires 'country' or 'countryField'");
    }

    const subdivisions = getSubdivisionsSafe(resolvedCountry);
    if (!subdivisions) {
        return definitionError(property, 'Region subdivision lookup is not available in i18n-iso-countries');
    }

    if (!subdivisions[`${resolvedCountry}-${value}`]) {
        return dataError(property, `Invalid region code for country ${resolvedCountry}`, value);
    }

    return [];
}
