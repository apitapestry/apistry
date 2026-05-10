import getAdapter from "../db/index.js";
import pluralize from "pluralize";
import { NotFoundError, UnprocessableEntityErrorBuilder } from "../utils/errors.js";
import { applyServerUpdates } from "../utils/applyServerUpdates.js";
import { extractUnsets } from "./updateHandler.js";
import { getChildSchemaItems, getParentSchema } from "../utils/subFilter.js";
import { stripReadOnly } from "../utils/stripReadOnly.js";
import {
    getCollection,
    getResourceId,
    getSubresource,
    mergeParamsQuery
} from "../utils/helpers.js";
import formatResponse from '../utils/formatResponse.js';

export default async function updateSubHandler(req, res) {
    const db = await getAdapter();

    const collection = getCollection(req);
    const subResource = getSubresource(req);
    const subResourceId = getResourceId(subResource);
    const resourceId = getResourceId(collection);

    const parentQuery = mergeParamsQuery(req, resourceId);

    // ----- Load subresource array -----
    const items = await db.getSubResource(collection, parentQuery, subResource);
    if (!items || items.length === 0) {
        throw new NotFoundError('subresource_not_found', {});
    }

    // ----- Resolve schemas from contract -----
    const parentSchema = getParentSchema(req, collection);
    const subResourceSchema = getChildSchemaItems(parentSchema, subResource);

    if (!subResourceSchema) {
        UnprocessableEntityErrorBuilder.throwOne({
            message: 'Invalid subresource schema',
            objectName: subResource
        });
    }

    // ----- Update subresource in memory -----
    const updatedItems = doUpdate(
        req,
        items,
        subResourceId,
        subResourceSchema
    );

    // ----- Apply parent audit updates -----
    const { updates: parentUpdates } = applyServerUpdates({
        schema: parentSchema,
        intent: "update",
        scope: "parent"
    });

    // ----- Persist full subresource back to parent -----
    const updateResult = await db.saveSubResource(
        collection,
        parentQuery,
        parentUpdates,
        subResource,
        updatedItems
    );

    if (updateResult.matchedCount === 0) {
        throw new NotFoundError('parent_not_found', {});
    }

    return formatResponse(updatedItems, req, res);
}

function doUpdate(req, items, subResourceId, subResourceSchema) {
    if (subResourceSchema.type !== "object") {
        return updatePrimitiveSubresource(req, items, subResourceSchema);
    }
    return updateObjectSubresource(
        req,
        items,
        subResourceId,
        subResourceSchema
    );
}

function updatePrimitiveSubresource(req, items, subResourceSchema) {
    const uniqueItems = subResourceSchema.uniqueItems === true;

    let keyValue = req.params[getSubresourceIdParam(req)];
    if (!keyValue) {
        UnprocessableEntityErrorBuilder.throwOne({
            message: 'Missing subresource value'
        });
    }

    const body = req.body;
    if (Array.isArray(body)) {
        UnprocessableEntityErrorBuilder.throwOne({
            message: 'Primitive subresource cannot accept array'
        });
    }

    let found = false;

    // Remove the item being updated before uniqueness check
    const remaining = items.filter(item => item !== keyValue);

    if (uniqueItems && remaining.includes(body)) {
        UnprocessableEntityErrorBuilder.throwOne({
            message: 'Duplicate subresource item',
            rejectedValue: body
        });
    }

    const updated = items.map(item => {
        if (item === keyValue) {
            found = true;
            return body;
        }
        return item;
    });

    if (!found) {
        UnprocessableEntityErrorBuilder.throwOne({
            message: 'Subresource not found'
        });
    }

    return updated;
}

function getSubresourceIdParam(req) {
    const sub = getSubresource(req);
    const pluralId = getResourceId(sub);
    return (
        pluralId in req.params
            ? pluralId
            : pluralize.singular(sub)
    );
}

function updateObjectSubresource(req, items, subResourceId, subResourceSchema) {
    const body = req.body;
    const keyValue = req.params[subResourceId];

    // ----- Single object update -----
    if (keyValue) {
        if (Array.isArray(body)) {
            UnprocessableEntityErrorBuilder.throwOne({
                message: 'Subresource with id cannot accept array'
            });
        }

        const clean = stripReadOnly(req);

        const { mutatedData } = applyServerUpdates({
            schema: subResourceSchema,
            intent: "update",
            scope: "child",
            data: clean,
            exclusionProp: subResourceId
        });

        return updateItem(items, subResourceId, keyValue, mutatedData);
    }

    // ----- Bulk update -----
    if (!Array.isArray(body)) {
        UnprocessableEntityErrorBuilder.throwOne({
            message: 'Subresource without id must be array'
        });
    }

    validateSubResourceIds(body, subResourceId);

    let updated = items;

    for (const item of body) {
        const id = item[subResourceId];
        const clean = stripReadOnly({ body: item }, subResourceId);

        const { mutatedData } = applyServerUpdates({
            schema: subResourceSchema,
            intent: "update",
            scope: "child",
            data: clean,
            exclusionProp: subResourceId
        });

        updated = updateItem(updated, subResourceId, id, mutatedData);
    }

    return updated;
}

function updateItem(items, subResourceId, keyValue, body) {
    const { set, unset } = extractUnsets(body);

    const item = items.find(i => i[subResourceId] === keyValue);
    if (!item) {
        UnprocessableEntityErrorBuilder.throwOne({
            message: 'Subresource id not found',
            property: subResourceId
        });
    }

    // Apply sets
    for (const [key, value] of Object.entries(set)) {
        item[key] = value;
    }

    // Apply unsets
    for (const key of Object.keys(unset)) {
        delete item[key];
    }

    return items;
}

function validateSubResourceIds(body, subResourceId) {
    for (const item of body) {
        if (!Object.prototype.hasOwnProperty.call(item, subResourceId)) {
            UnprocessableEntityErrorBuilder.throwOne({
                message: 'Missing required field',
                property: subResourceId
            });
        }
    }
}
