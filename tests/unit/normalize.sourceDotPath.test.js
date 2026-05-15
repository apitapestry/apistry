import { describe, it, expect } from 'vitest';
import { normalize } from '../../src/utils/normalize.js';

describe('normalize - source supports dot paths', () => {
    it('can read nested properties via dot-notation (e.g., wand.wood)', () => {
        const schema = {
            type: 'object',
            properties: {
                wandWood: {
                    type: 'string',
                    'x-transforms': [{ source: 'wand.wood' }]
                }
            }
        };

        const out = normalize(
            {
                wand: {
                    wood: 'holly',
                    core: 'phoenix tail feather',
                    length: 11
                }
            },
            schema
        );

        expect(out.wandWood).toBe('holly');
    });

    it('still supports direct keys (including keys that contain dots)', () => {
        const schema = {
            type: 'object',
            properties: {
                v: {
                    type: 'string',
                    'x-transforms': [{ source: 'a.b' }]
                }
            }
        };

        const out = normalize({ 'a.b': 'literal' }, schema);
        expect(out.v).toBe('literal');
    });
});

