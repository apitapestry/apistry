import { describe, it, expect } from 'vitest';
import { getPagination } from '../../src/utils/formatResponse.js';

describe('getPagination', () => {
    it('calculates correct pagination for typical case', () => {
        const result = getPagination({ offset: 10, limit: 5 }, 30, 5);
        expect(result).toEqual({
            start: 10,
            end: 14,
            total: 30,
            limit: 5,
            nextOffset: 15,
            prevOffset: 5,
            nextQuerystring: 'offset=15&limit=5',
            previousQuerystring: 'offset=5&limit=5'
        });
    });

    it('handles zero listLength', () => {
        const result = getPagination({ offset: 0, limit: 10 }, 100, 0);
        expect(result.end).toBe(0);
    });

    it('handles offset at zero', () => {
        const result = getPagination({ offset: 0, limit: 10 }, 100, 10);
        expect(result.prevOffset).toBe(null);
        expect(result.previousQuerystring).toBe(null);
    });

    it('handles totalCount null', () => {
        const result = getPagination({ offset: 0, limit: 10 }, null, 10);
        expect(result.nextOffset).toBe(10);
    });

    it('handles missing limit', () => {
        const result = getPagination({ offset: 5 }, 20, 5);
        expect(result.limit).toBe(undefined);
        expect(result.nextQuerystring).toBe('offset=10');
    });

    it('nulls next/prev at end of list', () => {
        // At end
        const result = getPagination({ offset: 25, limit: 5 }, 30, 5);
        expect(result.nextOffset).toBe(null);
        expect(result.nextQuerystring).toBe(null);
        // At start
        const result2 = getPagination({ offset: 0, limit: 5 }, 30, 5);
        expect(result2.prevOffset).toBe(null);
        expect(result2.previousQuerystring).toBe(null);
    });

    it('nulls nextQuerystring when offset+limit equals total', () => {
        const result = getPagination({ offset: 20, limit: 10 }, 30, 10);
        expect(result.nextQuerystring).toBe(null);
        expect(result.nextOffset).toBe(null);
    });

    it('nulls nextQuerystring when offset+limit exceeds total', () => {
        const result = getPagination({ offset: 25, limit: 10 }, 30, 5);
        expect(result.nextQuerystring).toBe(null);
        expect(result.nextOffset).toBe(null);
    });
});
