import getAdapter from "../db/index.js";
import { NotFoundError, UnprocessableEntityErrorBuilder } from "../utils/errors.js";
import { stripReadOnly } from "../utils/stripReadOnly.js";
import { applyServerUpdates } from "../utils/applyServerUpdates.js";
import { getParentSchema } from "../utils/subFilter.js";
import {
    getCollection,
    getResourceId,
    mergeParamsQuery
} from "../utils/helpers.js";
import formatResponse from '../utils/formatResponse.js';

export default async function updateHandler(req, res) {
    const db = await getAdapter();
    const collection = getCollection(req);
    const resourceId = getResourceId(collection);

    // ----- Resolve canonical parent schema from contract -----
    const parentSchema = getParentSchema(req, collection);
    if (!parentSchema) {
        UnprocessableEntityErrorBuilder.throwOne({
            message: 'Schema not found',
            objectName: collection
        });
    }

    const results = Array.isArray(req.body)
        ? await updateMany(req, db, collection, resourceId, parentSchema)
        : await updateOne(req, db, collection, resourceId, parentSchema);

    if (!results || results.updated === 0) {
        throw new NotFoundError('record_not_found', {});
    }

    return formatResponse(results.body, req, res);
}

async function updateOne(req, db, collection, resourceId, parentSchema) {
    const reqBody = stripReadOnly(req); // strip resourceId for single update

    const { mutatedData } = applyServerUpdates({
        schema: parentSchema,
        intent: "update",
        scope: "parent",
        data: reqBody
    });

    const query = mergeParamsQuery(req, resourceId);
    if (!query[resourceId]) {
        throw new NotFoundError('update_requires_id', { resourceId });
    }

    const { set, unset } = extractUnsets(mutatedData);

    return db.dbUpdate(collection, query, set, unset);
}

async function updateMany(req, db, collection, resourceId, parentSchema) {
    const body = stripReadOnly(req, resourceId); // keep resourceId for bulk

    const { mutatedData } = applyServerUpdates({
        schema: parentSchema,
        intent: "update",
        scope: "parent",
        data: body
    });

    const results = [];
    for (const item of mutatedData) {
        if (!item[resourceId]) {
            UnprocessableEntityErrorBuilder.throwOne({
                message: 'Missing required id',
                property: resourceId
            });
        }

        const { set, unset } = extractUnsets(item);

        const value = item[resourceId];
        delete set[resourceId];

        const result = await db.dbUpdate(
            collection,
            { [resourceId]: value },
            set,
            unset
        );

        if (!result.success || result.updated === 0) {
            throw new NotFoundError('record_not_found', {});
        }

        results.push(result.body);
    }

    return {
        operation: "update",
        success: results.length > 0,
        updated: results.length,
        body: results
    };
}

export function extractUnsets(body) {
    const set = {};
    const unset = {};

    for (const [key, value] of Object.entries(body)) {
        if (value === null) {
            unset[key] = "";
        } else {
            set[key] = value;
        }
    }

    return { set, unset };
}
