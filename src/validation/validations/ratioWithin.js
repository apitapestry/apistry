import { dataError, definitionError } from '../_helpers.js';

export function ratioWithin({ params, body, property }) {
    if (typeof params?.numerator !== 'string' || typeof params?.denominator !== 'string') {
        return definitionError(property, "ratioWithin expects 'numerator' and 'denominator' field names");
    }
    if (!Number.isFinite(Number(params?.min)) || !Number.isFinite(Number(params?.max))) {
        return definitionError(property, "ratioWithin expects numeric 'min' and 'max'");
    }

    const get = (path) => {
        const parts = String(path).split('.').filter(Boolean);
        let cur = body;
        for (const p of parts) cur = cur?.[p];
        return cur;
    };

    const numeratorRaw = get(params.numerator);
    const denominatorRaw = get(params.denominator);
    const numerator = Number(numeratorRaw);
    const denominator = Number(denominatorRaw);

    if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) {
        return dataError(property ?? `${params.numerator}/${params.denominator}`, 'Ratio inputs must be numbers', { numerator: numeratorRaw, denominator: denominatorRaw });
    }
    if (denominator === 0) {
        return dataError(property ?? `${params.numerator}/${params.denominator}`, 'Denominator must not be 0', denominatorRaw);
    }

    const ratio = numerator / denominator;
    const min = Number(params.min);
    const max = Number(params.max);
    if (ratio < min || ratio > max) {
        return dataError(property ?? `${params.numerator}/${params.denominator}`, `Ratio must be between ${min} and ${max}`, ratio);
    }

    return [];
}
