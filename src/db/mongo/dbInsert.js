import { getDb } from "./adapter.js";
import { getResourceId } from "../../utils/helpers.js";

export async function dbInsert(collection, body) {
    const db = getDb(collection);
    const resourceId = getResourceId(collection);
    const results = { operation: "insert" };

    // Normalize to array
    const docs = Array.isArray(body) ? body : [body];

    // Validate required IDs exist
    for (const doc of docs) {
        if (doc[resourceId] === undefined) {
            throw new Error(
                `dbInsert missing required id field '${resourceId}' on inserted document.`
            );
        }
    }

    // Insert
    if (docs.length === 1) {
        await db.insertOne(docs[0]);
        results.inserted = 1;
    } else {
        await db.insertMany(docs);
        results.inserted = docs.length;
    }

    results.success = true;
    results.body = docs;
    return results;
}
