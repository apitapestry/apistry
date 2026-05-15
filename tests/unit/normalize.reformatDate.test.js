import { describe, it, expect } from 'vitest';
import { normalize } from '../../src/utils/normalize.js';

describe('normalize - reformat-date', () => {
    it('reformats dd-mm-yyyy to ISO yyyy-mm-dd when input format is provided', () => {
        const schema = {
            type: 'object',
            properties: {
                birthDate: {
                    type: 'string',
                    format: 'date',
                    'x-transforms': [{ source: 'dob' }, { 'reformat-date': 'dd-mm-yyyy' }]
                }
            }
        };

        const out = normalize({ dob: '31-07-1980' }, schema);
        expect(out.birthDate).toBe('1980-07-31');
    });

    it('reformats yyyy/mm/dd to ISO yyyy-mm-dd when input format is provided', () => {
        const schema = {
            type: 'object',
            properties: {
                releaseDate: {
                    type: 'string',
                    format: 'date',
                    'x-transforms': [{ source: 'release' }, { 'reformat-date': 'yyyy/mm/dd' }]
                }
            }
        };

        const out = normalize({ release: '1980/07/31' }, schema);
        expect(out.releaseDate).toBe('1980-07-31');
    });

    it('still supports the mode-only form (date)', () => {
        const schema = {
            type: 'object',
            properties: {
                birthDate: {
                    type: 'string',
                    format: 'date',
                    'x-transforms': [{ source: 'dob' }, { 'reformat-date': 'date' }]
                }
            }
        };

        const out = normalize({ dob: '31-07-1980' }, schema);
        expect(out.birthDate).toBe('1980-07-31');
    });

    it('outputs ISO date-time when time is present (mode date-time)', () => {
        const schema = {
            type: 'object',
            properties: {
                createdDateTime: {
                    type: 'string',
                    format: 'date-time',
                    'x-transforms': [{ source: 'created' }, { 'reformat-date': 'date-time' }]
                }
            }
        };

        const out = normalize({ created: '31-07-1980 10:20:30' }, schema);
        // Treated as UTC; must be stable
        expect(out.createdDateTime).toBe('1980-07-31T10:20:30.000Z');
    });

    it('leaves value unchanged if input format is provided but does not match', () => {
        const schema = {
            type: 'object',
            properties: {
                birthDate: {
                    type: 'string',
                    format: 'date',
                    'x-transforms': [{ source: 'dob' }, { 'reformat-date': 'dd-mm-yyyy' }]
                }
            }
        };

        const out = normalize({ dob: '1980-07-31' }, schema);
        expect(out.birthDate).toBe('1980-07-31');
    });

    it('leaves unrecognized values unchanged', () => {
        const schema = {
            type: 'object',
            properties: {
                weird: {
                    type: 'string',
                    'x-transforms': [{ source: 'v' }, { 'reformat-date': 'date' }]
                }
            }
        };

        const out = normalize({ v: 'not-a-date' }, schema);
        expect(out.weird).toBe('not-a-date');
    });
});
