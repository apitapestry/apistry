// Extracted from helpers.js
// Formats API responses according to OpenAPI schema and request context.
import { NotFoundError } from './errors.js';
import { getResponseCode, getResponseSchema } from './helpers.js';
import { normalize } from './normalize.js';

function isPrimitiveSchema(schema) {
    return ['string', 'number', 'integer', 'boolean'].includes(schema?.type);
}

function isArraySchema(schema) {
    return schema?.type === 'array' || Boolean(schema?.items);
}

function isWrapperWithResults(schema) {
    return schema?.type === 'object' && Boolean(schema?.properties?.results);
}

function coerceSingle(results) {
    if (!Array.isArray(results)) return results;
    if (results.length > 0) return results[0];
    throw new NotFoundError({ message: 'Record not found' });
}

function applyXFormat(template, pagination) {
    if (typeof template !== 'string' || template.length === 0) return template;
    // Replace any {key} with the value from pagination if it exists
    return template.replace(/\{(\w+)}/g, (_m, key) => {
        const v = pagination[key];
        return v === undefined || v === null ? '' : String(v);
    });
}

export function getPagination(query, total, listLength) {
    const start = query?.offset !== undefined ? Number.parseInt(query.offset, 10) : 0;
    const limit = query?.limit !== undefined ? Number.parseInt(query.limit, 10) : undefined;
    const step = (limit ?? listLength ?? 0) || 0;

    const end = listLength === 0 ? start : start + listLength - 1;

    let nextQuerystring = null;
    let nextOffset = null;
    if (step > 0) {
        if (total !== null && total !== undefined) {
            if (start + step < total) {
                nextOffset = start + step;
                nextQuerystring = `offset=${nextOffset}` + (limit !== undefined ? `&limit=${limit}` : '');
            }
        } else {
            // total unknown, always provide next
            nextOffset = start + step;
            nextQuerystring = `offset=${nextOffset}` + (limit !== undefined ? `&limit=${limit}` : '');
        }
    }

    let previousQuerystring = null;
    let prevOffset = null;
    if (start > 0 && step > 0) {
        prevOffset = Math.max(0, start - step);
        previousQuerystring = `offset=${prevOffset}` + (limit !== undefined ? `&limit=${limit}` : '');
    }

    return {
        start,
        end,
        total,
        limit,
        nextOffset,
        prevOffset,
        nextQuerystring,
        previousQuerystring
    };
}

export default function formatResponse(results, req, res, totalCount = null) {
    // Only normalize if not orchestration (orchestration normalizes separately)
    const responseSchema = getResponseSchema(req);
    if (Array.isArray(results)) {
        // short term solution until normalize can handle oneOf
        for (const item of results) {
            if (item && typeof item === 'object' && '_id' in item) {
                delete item._id;
            }
        }
    } else if (results && typeof results === 'object') {
        delete results._id;
    }
    if (responseSchema) {
        results = normalize(results, responseSchema);
    }

    // Check for empty/null results and 404 response option
    const responseSchemas = req.routeOptions?.schema?.response;
    const has404 = responseSchemas && Object.keys(responseSchemas).some(code => String(code) === '404');
    const isEmpty = results == null
        || (Array.isArray(results) && results.length === 0)
        || (results && typeof results === 'object' && Array.isArray(results.results) && results.results.length === 0);
    if (isEmpty) {
        if (has404) {
            res.status(404);
            throw new NotFoundError({ message: 'Record not found' });
        } else {
            // Return empty array or empty results wrapper
            if (isWrapperWithResults(responseSchema)) {
                return { results: [] };
            }
            if (isArraySchema(responseSchema)) {
                return [];
            }
        }
    }

    res.status(getResponseCode(req));
    // If there's no responseSchema, fall back to legacy behavior: return what we got.
    if (!responseSchema) return results;

    // Rule 5: wrapper object with a results array
    const list = Array.isArray(results) ? results : (results?.results ?? []);
    if (isWrapperWithResults(responseSchema) && list.length > 0) {
        const pagination = getPagination(req.query, totalCount, list.length);

        // Build object based on declared properties.
        const out = {};
        const props = responseSchema.properties ?? {};

        for (const [key, propSchema] of Object.entries(props)) {
            if (key === 'results') {
                out.results = list;
                continue;
            }

            // Only compute additional fields for wrapper objects.
            if (typeof propSchema?.['x-format'] === 'string') {
                out[key] = applyXFormat(propSchema['x-format'], pagination);
                continue;
            }

            // If caller passed back an object with this key, preserve it.
            if (results && typeof results === 'object' && !Array.isArray(results) && key in results) {
                out[key] = results[key];
            }

            // Otherwise leave undefined; responseSchema acts as a template, but we don't invent values.
        }

        // Ensure results exists even if not enumerated for some reason.
        if (!('results' in out)) out.results = list;

        return out;
    }

    // Rule 1 & 2: primitive or object responseSchema (not an array) => single result
    if (isPrimitiveSchema(responseSchema) || (!isArraySchema(responseSchema) && responseSchema?.type !== 'array')) {
        return coerceSingle(results);
    }

    // Rule 3 & 4: array responseSchema => return list as-is
    if (isArraySchema(responseSchema)) {
        return Array.isArray(results) ? results : (results ? [results] : []);
    }

    // Fallback: preserve payload
    return results;
}
