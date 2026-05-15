import { describe, it, expect } from 'vitest';
import { normalize } from '../../src/utils/normalize.js';

describe('normalize - apply-template', () => {
    it('applies template to every element in an array', () => {
        const schema = {
            type: 'object',
            properties: {
                people: {
                    type: 'array',
                    items: { type: 'string' },
                    'x-transforms': [
                        { source: 'films' },
                        { 'map-pattern': '^.*/(\\d+)/?$' },
                        { 'apply-template': '/v1/people/{}' }
                    ]
                }
            }
        };

        const out = normalize(
            {
                films: [
                    'https://swapi.py4e.com/api/people/1/',
                    'https://swapi.py4e.com/api/people/2/'
                ]
            },
            schema
        );

        expect(out.people).toEqual(['/v1/people/1', '/v1/people/2']);
    });

    it('applies template to a scalar string value', () => {
        const schema = {
            type: 'object',
            properties: {
                person: {
                    type: 'string',
                    'x-transforms': [
                        { source: 'id' },
                        { 'apply-template': '/v1/people/{}' }
                    ]
                }
            }
        };

        const out = normalize({ id: '1' }, schema);
        expect(out.person).toBe('/v1/people/1');
    });
});

