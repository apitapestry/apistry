import { dataError, definitionError, present } from '../_helpers.js';

export function maxItemsWhere({ value, property, params }) {
    if (!Array.isArray(value)) return [];

    if (typeof params?.field !== 'string' || params.field.trim() === '' || !present(params?.max)) {
        return definitionError(property, "maxItemsWhere expects 'field' (string) and 'max' (number)");
    }

    const count = value.filter(v => v?.[params.field] === params.equals).length;
    if (count > params.max) {
        return dataError(property, `At most ${params.max} items where ${params.field}=${params.equals}`, value);
    }
    return [];
}
