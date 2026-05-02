import * as BadWordsModule from 'bad-words';
import { dataError, present } from '../_helpers.js';

// Support multiple module shapes for `bad-words` across Node/Vitest/bundlers.
const FilterCtor = BadWordsModule.Filter ?? BadWordsModule.default ?? BadWordsModule;

const filter = new FilterCtor({
    placeHolder: '*'
});

filter.addWords('wtf');       // if you want
// filter.removeWords('hell');   // if you decide that’s OK internally

export function profanity({ value, property }) {
    if (!present(value)) return [];
    if (typeof value !== 'string') return [];

    if (filter.isProfane(value)) {
        return dataError(property, 'Agent notes may not contain profanity', value);
    }

    return [];
}
