// Shared helper utilities used across db handlers and orchestration.
// Keep this file dependency-light; it should not depend on db-specific modules.

import { NotFoundError } from './errors.js';
import { UnprocessableEntityErrorBuilder } from './errors.js';
import pluralize from 'pluralize';

/* -------------------------------------------------------------------------- */
/*                       RESPONSE SHAPE FROM OPENAPI                           */
/* -------------------------------------------------------------------------- */
export function getResponseCode(req) {
    if (!req) return 204;
    if ((req.method ?? '').toUpperCase() === 'POST') return 201; // Default for creation

    const responses = req.routeOptions?.schema?.response;
    if (!responses) return 204;

    const codes = Object.keys(responses)
        .map(Number)
        .filter(n => n >= 200 && n < 300)
        .sort((a, b) => b - a);

    return codes.length !== 0 ? codes[0] : 204;
}

export function getResponseSchema(req) {
    const responses = req.routeOptions?.schema?.response;
    const responseCode = getResponseCode(req);
    return responses?.[responseCode]
        ?.content?.['application/json']?.schema;
}

export function getIncludeResult(req) {
    return (req.method ?? '').toUpperCase() === 'POST'
        ? Boolean(getResponseSchema(req))
        : getResponseCode(req) !== 204;
}

export function getCollectionSource(req) {
    const schema = getResponseSchema(req);
    return schema?.['x-collection-source'];
}

/* -------------------------------------------------------------------------- */
/*                             DB UTILITIES                                   */
/* -------------------------------------------------------------------------- */
export function getCollection(req) {
    // collection is based on x-collection extension
    let collection = req.routeOptions?.schema?.['x-collection'];
    if (!collection) {
        throw new NotFoundError(
            "Collection name not found. Ensure your OpenAPI operation specifies an x-collection extension."
        );
    }
    return collection;
}

export function getSubresource(req) {
    const path = req.routeOptions?.url || req.url.split('?')[0]; // Remove query params
    const parts = path.split('/').filter(part => part && !part.startsWith(':')); // Filter out params and empty parts
    let subResource;

    if (parts[0] && /^v\d+$/.test(parts[0])) {
        subResource = parts[2] || null;
    } else {
        subResource = parts[1] || null;
    }
    return subResource;
}

export function getResource(req) {
    const path = req.routeOptions?.url || req.url.split('?')[0]; // Remove query params
    const parts = path.split('/').filter(part => part && !part.startsWith(':')); // Filter out params and empty parts

    if (parts[0] && /^v\d+$/.test(parts[0])) {
        return parts[1] || null;
    }
    return parts[0] || null;
}

export function getResourceId(resource) {
    if (!resource) return 'id';
    // Use pluralize library to singularize
    const singular = pluralize.singular(resource);
    return singular + 'Id';
}

export function mergeParamsQuery(req, resourceId = undefined, isInclusive = true, optionsArg = undefined) {
    const params = req.params || {};
    const optionKeys = ['limit', 'offset', 'order'];

    const normalizedParams = {};
    for (const [key, value] of Object.entries(params)) {
        normalizedParams[key] = Array.isArray(value) ? value.map(v => v ?? "") : (value ?? "");
    }

    let query = { ...req.query, ...normalizedParams };

    // Build schema hints if requested.
    const wantSchema = Boolean(optionsArg?.includeSchema);
    let schema = undefined;
    if (wantSchema) {
        schema = buildParamSchemaHints(req, query);
    }

    // if resourceId is provided and isInclusive, return only that key (if present)
    if (resourceId && isInclusive) {
        const q = query[resourceId] !== undefined ? { [resourceId]: query[resourceId] } : {};
        if (!wantSchema) return q;
        return { query: q, schema: pickKeys(schema, Object.keys(q)) };
    }

    // if resourceId is provided and not isInclusive, return all except that key
    if (resourceId && !isInclusive) {
        delete query[resourceId];
        if (schema) delete schema[resourceId];
    }

    // Remove option keys from query
    for (const opt of optionKeys) {
        delete query[opt];
        if (schema) delete schema[opt];
    }

    if (!wantSchema) return query;
    return { query, schema };
}

function buildParamSchemaHints(req, mergedQuery) {
    const routeSchema = req.routeOptions?.schema;
    const qsProps = routeSchema?.querystring?.properties ?? {};
    const paramsProps = routeSchema?.params?.properties ?? {};

    // Prefer querystring definition over params if both exist.
    const schema = {};

    for (const key of Object.keys(mergedQuery ?? {})) {
        const def = qsProps[key] ?? paramsProps[key];
        if (!def || typeof def !== 'object') continue;

        // Handle arrays by hinting the item type.
        if (def.type === 'array' && def.items) {
            schema[key] = {
                schemaType: def.items.type,
                schemaFormat: def.items.format
            };
            continue;
        }

        schema[key] = {
            schemaType: def.type,
            schemaFormat: def.format
        };
    }

    return schema;
}

function pickKeys(obj, keys) {
    if (!obj) return undefined;
    const out = {};
    for (const k of keys) {
        if (Object.prototype.hasOwnProperty.call(obj, k)) {
            out[k] = obj[k];
        }
    }
    return out;
}

export function buildQueryOptions(req) {
    const options = {};
    const query = req.query || {};

    if (query.offset) {
        if (!query.limit) {
            UnprocessableEntityErrorBuilder.throwOne({
                message: "'offset' cannot be used without 'limit'",
                objectName: 'req.query',
                property: 'offset'
            });
        }
        if (!Number.isInteger(query.offset) || query.offset < 0) {
            UnprocessableEntityErrorBuilder.throwOne({
                message: "offset must be a non-negative integer",
                objectName: 'req.query',
                property: 'offset'
            });
        }
        options.offset = parseInt(query.offset, 10);
    }

    if (query.limit) options.limit = parseInt(query.limit, 10);

    if (query.order) {
        const sort = {};
        query.order.split(",").forEach(part => {
            const [field, dir] = part.trim().split(".");
            if (!field) return;
            sort[field] = dir?.toLowerCase() === "desc" ? -1 : 1;
        });
        options.sort = sort;
    }

    const defaultLimit = req.routeOptions?.schema?.querystring?.properties?.limit?.default;
    options.hasLimit = options.limit && defaultLimit && defaultLimit !== options.limit;

    return options;
}
