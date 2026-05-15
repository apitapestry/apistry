import getAdapter from "../db/index.js";
import { NotFoundError, UnprocessableEntityErrorBuilder } from "../utils/errors.js";
import { stripReadOnly } from "../utils/stripReadOnly.js";
import { applyServerUpdates } from "../utils/applyServerUpdates.js";
import { getParentSchema } from "../utils/subFilter.js";
import { getCollection } from "../utils/helpers.js";
import formatResponse from "../utils/formatResponse.js";
import { validateRequest } from "../validation/validateRequest.js";

export default async function insertHandler(req, res) {
    const db = await getAdapter();
    const collection = getCollection(req);

    // ----- Resolve canonical parent schema from contract -----
    const parentSchema = getParentSchema(req, collection);
    if (!parentSchema) {
        UnprocessableEntityErrorBuilder.throwOne({
            message: 'Schema not found',
            objectName: collection
        });
    }

    // ----- Prepare client payload -----
    let body = stripReadOnly(req);

// 🔒 Contract-declared validations (x-validations)
    await validateRequest({
        schema: parentSchema,
        body,
        intent: "insert",
        prior: undefined,
        externalServices: req.server?.externalServices,
        request: {
            body: req.body,
            query: req.query,
            headers: req.headers
        }
    });

    // ----- Apply server-owned insert updates (ids, timestamps, etc) -----
    const { mutatedData } = applyServerUpdates({
        schema: parentSchema,
        intent: "insert",
        scope: "parent",
        data: body
    });

    // ----- Persist -----
    const resp = await db.dbInsert(collection, mutatedData);

    if (!resp?.success || resp.inserted === 0) {
        throw new NotFoundError('record_not_inserted', {});
    }

    return formatResponse(resp.body, req, res);
}
