import getAdapter from "../db/index.js";
import pluralize from "pluralize";
import { applyServerUpdates } from "../utils/applyServerUpdates.js";
import formatResponse from '../utils/formatResponse.js';
import {
    NotFoundError,
    UnprocessableEntityErrorBuilder,
    InternalServerError
} from "../utils/errors.js";
import {
    filterSubResource,
    filterSubResourceDel,
    getChildSchemaItems,
    getParentSchema
} from "../utils/subFilter.js";
import {
    getResourceId,
    getSubresource,
    getCollection,
    mergeParamsQuery
} from "../utils/helpers.js";

export default async function deleteSubHandler(req, res) {
    const db = await getAdapter();
    const collection = getCollection(req);
    const resourceId = getResourceId(collection);
    const subResource = getSubresource(req);
    const subResourceId = getResourceId(subResource);
    const parentQuery = mergeParamsQuery(req, resourceId);
    const subQuery = mergeParamsQuery(req, resourceId, false);

    if (!subQuery || Object.keys(subQuery).length === 0) {
        throw new InternalServerError(
            'delete_requires_filter',
            { hint: 'Delete requires at least 1 subresource filter' }
        );
    }

    // ----- Load subresource array -----
    const items = await db.getSubResource(collection, parentQuery, subResource);
    if (!items) {
        throw new NotFoundError('parent_not_found', {});
    }

    // ----- Resolve schemas -----
    const parentSchema = getParentSchema(req, collection);
    const subResourceSchema = getChildSchemaItems(parentSchema, subResource);
    if (!subResourceSchema) {
        UnprocessableEntityErrorBuilder.throwOne({
            message: 'Invalid subresource schema',
            objectName: subResource
        });
    }

    // ----- Identify matches FIRST -----
    const matchedItems = filterSubResource(items, subQuery);

    // Nothing matched
    if (matchedItems.length === 0) {
        // Identity-based delete (path param) → 404
        if (req.params?.[subResourceId] ||
            req.params?.[pluralize.singular(subResource)]) {
            throw new NotFoundError('subresource_not_found', {});
        }

        // Filter-based delete → no-op, empty response
        return formatResponse([], req, res);
    }

    // ----- Apply deletion -----
    const updatedItems = filterSubResourceDel(items, subQuery);

    // ----- Apply parent audit updates -----
    const { updates: parentUpdates } = applyServerUpdates({
        schema: parentSchema,
        intent: "update",
        scope: "parent"
    });

    // ----- Persist parent -----
    const result = await db.saveSubResource(
        collection,
        parentQuery,
        parentUpdates,
        subResource,
        updatedItems
    );

    if (result.matchedCount === 0) {
        throw new NotFoundError('parent_not_found', {});
    }

    return formatResponse(updatedItems, req, res);
}

function doDelete(req, items, subResource, subResourceSchema, subQuery) {
    if (subResourceSchema.type !== "object") {
        return deletePrimitiveSubresource(req, items, subResource, subQuery);
    }
    return deleteObjectSubresource(items, subQuery);
}

function deletePrimitiveSubresource(req, items, subResource, subQuery) {
    const subResourceId = getResourceId(subResource);
    const subResourceSingle = pluralize.singular(subResource);

    const paramValue =
        req.params?.[subResourceId] ??
        req.params?.[subResourceSingle];

    // ----- Path delete: /features/{value} -----
    if (paramValue != null && String(paramValue).length > 0) {
        const updatedItems = items.filter(v => v !== paramValue);
        return {
            updatedItems,
            deletedCount: items.length - updatedItems.length,
            usedFilter: false
        };
    }

    // ----- Query delete: ?feature=Something* -----
    const updatedItems = filterSubResourceDel(items, subQuery);

    return {
        updatedItems,
        deletedCount: items.length - updatedItems.length,
        usedFilter: true
    };
}

function deleteObjectSubresource(items, subQuery) {
    const updatedItems = filterSubResourceDel(items, subQuery);

    return {
        updatedItems,
        deletedCount: items.length - updatedItems.length,
        usedFilter: true
    };
}
