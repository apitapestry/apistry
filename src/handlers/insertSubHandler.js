import getAdapter from "../db/index.js";
import { NotFoundError, UnprocessableEntityErrorBuilder } from "../utils/errors.js";
import { applyServerUpdates } from "../utils/applyServerUpdates.js";
import { getChildSchema, getParentSchema } from "../utils/subFilter.js";
import { stripReadOnly } from "../utils/stripReadOnly.js";
import formatResponse from '../utils/formatResponse.js';
import {
    getSubresource,
    getCollection,
    getResourceId,
    mergeParamsQuery
} from "../utils/helpers.js";

export default async function insertSubHandler(req, res) {
    const db = await getAdapter();

    const collection = getCollection(req);
    const subResource = getSubresource(req);
    const subResourceId = getResourceId(subResource);
    const resourceId = getResourceId(collection);
    const parentQuery = mergeParamsQuery(req, resourceId);

    // ----- Load parent subresource array -----
    const items = await db.getSubResource(collection, parentQuery, subResource);
    if (!items) {
        throw new NotFoundError('parent_not_found', {});
    }

    // ----- Resolve schemas from contract -----
    const parentSchema = getParentSchema(req, collection);
    const subResourceSchema = getChildSchema(parentSchema, subResource);

    if (!subResourceSchema) {
        UnprocessableEntityErrorBuilder.throwOne({
            message: 'invalid subresource schema',
            objectName: subResource,
            property: subResource
        });
    }

    // ----- Insert into subresource array (in memory) -----
    const updatedItems = doInsert(req, items, subResource, subResourceId, subResourceSchema);

    // ----- Apply parent audit updates -----
    const { updates: parentUpdates } = applyServerUpdates({
        schema: parentSchema,
        intent: "update",
        scope: "parent"
    });

    // ----- Persist full subresource back to parent -----
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

/**
 * Insert subresource items into an existing array.
 * Honors uniqueItems ONLY for primitive subresources.
 */
function doInsert(req, items, subResource, subResourceId, subResourceSchema) {
    const body = req.body;
    const isPrimitive = subResourceSchema.items.type !== "object";
    const uniqueItems = subResourceSchema.uniqueItems === true;

    // ----- Primitive subresource -----
    if (isPrimitive) {
        const incoming = Array.isArray(body) ? body : [body];

        if (uniqueItems) {
            const existingSet = new Set(items);
            for (const value of incoming) {
                if (existingSet.has(value)) {
                    UnprocessableEntityErrorBuilder.throwOne({
                        message: 'duplicate subresource item',
                        objectName: subResource,
                        property: subResource,
                        rejectedValue: value
                    });
                }
            }
        }

        return [...items, ...incoming];
    }

    // ----- Object subresource (uniqueItems ignored by design) -----
    const insertOne = (raw) => {
        const clean = stripReadOnly({ body: raw }, subResourceId);

        const { mutatedData } = applyServerUpdates({
            schema: subResourceSchema.items,
            intent: "insert",
            scope: "child",
            data: clean
        });

        return mutatedData;
    };

    // ----- Bulk insert -----
    if (Array.isArray(body)) {
        return [...items, ...body.map(insertOne)];
    }

    // ----- Single insert -----
    return [...items, insertOne(body)];
}
