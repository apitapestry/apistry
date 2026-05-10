import { InternalServerError, NotFoundError } from "../../utils/errors.js";
import { getDb } from "./adapter.js";

/**
 * Fetch an embedded subresource (array) from a MongoDB document.
 */
export async function getSubResource(collection, query, subResource) {
    const db = getDb(collection);

    if (!query || Object.keys(query).length === 0) {
        throw new InternalServerError(
            "Operation requires a parent resource query"
        );
    }

    const parentDoc = await db.findOne(query);

    if (!parentDoc) {
        throw new NotFoundError("Parent resource not found");
    }

    return Array.isArray(parentDoc[subResource])
        ? parentDoc[subResource]
        : [];
}

/**
 * Replace (overwrite) a subresource array.
 */
export async function saveSubResource(
    collection,
    parentQuery,
    parentUpdates,
    subResource,
    updatedItems
) {
    const db = getDb(collection);

    const update = {
        $set: {
            [subResource]: updatedItems,
            ...(parentUpdates || {})
        }
    };

    const result = await db.findOneAndUpdate(
        parentQuery,
        update,
        { returnDocument: "after" }
    );

    if (!result.value) {
        return {
            success: false,
            updated: 0,
            body: null
        };
    }

    return {
        success: true,
        updated: 1,
        body: result.value
    };
}
