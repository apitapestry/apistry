import getAdapter from "../db/index.js";
import formatResponse from '../utils/formatResponse.js';
import { buildFilters } from '../utils/filters.js';
import {
    getCollection,
    mergeParamsQuery,
    buildQueryOptions,
    getResource
} from "../utils/helpers.js";

export default async function getHandler(req, res) {
    const db = await getAdapter();
    const collection = getCollection(req);
    addXFilters(req); // must be called before building filters - adds x-filters to req.query

    const merged = mergeParamsQuery(req, undefined, true, { includeSchema: true });
    const query = merged.query;
    const options = buildQueryOptions(req);
    const filter = buildFilters(collection, getResource(req), query, undefined, true, { schema: merged.schema });

    const results = await db.dbGet(collection, filter, options);

    const totalCount = (options.limit !== undefined || options.offset !== undefined)
        ? await db.dbCount(collection, query, { schema: merged.schema })
        : undefined;

    return formatResponse(results, req, res, totalCount);
}

function addXFilters(req) {
    const reqXFilters = req.routeOptions?.schema?.['x-filters'];
    if (!reqXFilters) return;

    // Support array or a single string.
    const xFilters = Array.isArray(reqXFilters)
        ? reqXFilters : [reqXFilters];

    for (const filter of xFilters) {
        if (typeof filter === 'string') {
            const dotIndex = filter.indexOf('.');
            if (dotIndex > 0) {
                const prop = filter.substring(0, dotIndex);
                const value = filter.substring(dotIndex + 1);
                if (!Object.prototype.hasOwnProperty.call(req.query, prop)) {
                    req.query[prop] = value;
                }
            }
        }
    }
}