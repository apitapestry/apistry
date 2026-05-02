import { dataError, definitionError } from '../_helpers.js';

export function sortedBy({ value, property, params }) {
    if (!Array.isArray(value)) return [];

    if (typeof params?.field !== 'string' || params.field.trim() === '') {
        return definitionError(property, "sortedBy expects 'field' (string)");
    }

    const order = params.order ?? 'asc';
    if (order !== 'asc' && order !== 'desc') {
        return definitionError(property, "sortedBy 'order' must be 'asc' or 'desc'");
    }

    const dir = order === 'desc' ? -1 : 1;
    for (let i = 1; i < value.length; i++) {
        if ((value[i - 1][params.field] > value[i][params.field]) === (dir === 1)) {
            return dataError(property, `Must be sorted by '${params.field}' ${order}`, value);
        }
    }
    return [];
}
