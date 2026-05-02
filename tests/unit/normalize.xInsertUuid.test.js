import { describe, it, expect } from 'vitest';
import { normalize } from '../../src/utils/normalize.js';

describe('normalize - x-insert: uuid', () => {
    it('generates a uuid for missing values when x-insert is uuid', () => {
        const schema = {
            type: 'object',
            properties: {
                personId: {
                    type: 'string',
                    format: 'uuid',
                    readOnly: true,
                    'x-insert': 'uuid'
                },
                name: { type: 'string' }
            }
        };

        const out = normalize({ name: 'Alice' }, schema);

        expect(out.name).toBe('Alice');
        expect(typeof out.personId).toBe('string');
        // UUID v4 format (accept any version in [1-5] just in case)
        expect(out.personId).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        );
    });

    it('does not overwrite an existing value', () => {
        const schema = {
            type: 'object',
            properties: {
                personId: {
                    type: 'string',
                    format: 'uuid',
                    readOnly: true,
                    'x-insert': 'uuid'
                }
            }
        };

        const out = normalize(
            { personId: 'a3bb189e-8bf9-3888-9912-ace4e6543002' },
            schema
        );

        expect(out.personId).toBe('a3bb189e-8bf9-3888-9912-ace4e6543002');
    });

    it('ignores x-insert directives other than uuid', () => {
        const schema = {
            type: 'object',
            properties: {
                createdAt: {
                    type: 'string',
                    format: 'date-time',
                    readOnly: true,
                    'x-insert': 'now'
                }
            }
        };

        const out = normalize({}, schema);
        expect(out.createdAt).toBeUndefined();
    });
});

