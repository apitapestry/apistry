import getAdapter from "../db/index.js";
import { NotFoundError } from "../utils/errors.js";
import { filterSubResource } from "../utils/subFilter.js";
import formatResponse from '../utils/formatResponse.js';
import {
    getResourceId,
    getCollection,
    getSubresource,
    mergeParamsQuery
} from "../utils/helpers.js";

export default async function getSubHandler(req, res) {
    const db = await getAdapter();
    const collection = getCollection(req);
    const subResource = getSubresource(req);
    const subResourceId = getResourceId(subResource);
    const resourceId = getResourceId(collection);
    const parentQuery = mergeParamsQuery(req, resourceId);

    const items = await db.getSubResource(collection, parentQuery, subResource);

    // APPLY FILTERS
    const subQuery = mergeParamsQuery(req, resourceId, false);
    const filteredItems = filterSubResource(items, subQuery);

    // Subresource requested with filters but nothing matched
    if (filteredItems.length === 0 && req && req.params[subResourceId]) {
        throw new NotFoundError('subresource_not_found', {});
    }

    return formatResponse(filteredItems, req, res);
}
