import { describe, expect, it } from 'vitest';
import { getCorsConfig } from '../../src/utils/configHelpers.js';

describe('getCorsConfig', () => {
    it('returns an origins array as the runtime origins option', () => {
        expect(getCorsConfig({
            enabled: true,
            origins: ['http://localhost:8080']
        })).toEqual({
            enabled: true,
            origins: ['http://localhost:8080']
        });
    });

    it('returns an origins string as the runtime origins option', () => {
        expect(getCorsConfig({
            origins: 'https://api.apistry.net'
        })).toEqual({
            enabled: true,
            origins: 'https://api.apistry.net'
        });
    });

    it('returns origins true as the permissive runtime origins option', () => {
        expect(getCorsConfig({
            origins: true
        })).toEqual({
            enabled: true,
            origins: true
        });
    });

    it('returns undefined when cors config is omitted', () => {
        expect(getCorsConfig(undefined)).toBeUndefined();
    });
});
