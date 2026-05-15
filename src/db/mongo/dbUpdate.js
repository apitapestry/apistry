import { getDb } from "./adapter.js";

export async function dbUpdate(collection, query, set = {}, unset = {}) {
    const db = getDb(collection);
    const update = {};

    if (set && Object.keys(set).length > 0) {
        update.$set = set;
    }

    if (unset && Object.keys(unset).length > 0) {
        update.$unset = unset;
    }

    // Safety: nothing to update
    if (Object.keys(update).length === 0) {
        return {
            operation: "update",
            success: false,
            updated: 0,
            body: null
        };
    }

    const result = await db.findOneAndUpdate(
        query,
        update,
        {
            returnDocument: "after" // MongoDB >= 4.4
        }
    );

    return {
        operation: "update",
        success: !!result,
        updated: result ? 1 : 0,
        body: result
    };
}
