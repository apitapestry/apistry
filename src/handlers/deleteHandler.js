import { UnprocessableEntityErrorBuilder, InternalServerError } from "../utils/errors.js";
import formatResponse from '../utils/formatResponse.js';
import getAdapter from "../db/index.js";
import {
    getCollection,
    mergeParamsQuery
} from "../utils/helpers.js";

export default async function deleteHandler(req, res) {
    const db = await getAdapter();
    const collection = getCollection(req);
    const query = mergeParamsQuery(req);
    const softDelete = getSoftDelete(req);

    if (Object.keys(query).length === 0) {
        UnprocessableEntityErrorBuilder.throwOne({
            message: 'Delete requires query or path parameters'
        });
    }

    let result;
    if (softDelete) {
        result = await db.dbUpdate(collection, query, softDelete);
    } else {
        result = await db.dbDelete(collection, query);
    }

    if (!result.success) {
        throw new InternalServerError('delete_failed', {});
    }

    return formatResponse(result.body, req, res);
}

function getSoftDelete(req) {
    let softDel = req.routeOptions?.schema?.['x-soft-delete'];
    if (!softDel || !softDel.includes('.')) return;

    softDel = softDel.split('.');
    return { [softDel[0]]: softDel[1] };
}