import { getDb } from "./adapter.js";
import { getResourceId } from "../../utils/helpers.js";

/**
 * Insert one or many documents into the SQLite table.
 *
 * The `id` column is populated from the document's <singular>Id field
 * (e.g. carId for the `cars` table). The full JSON document is stored
 * in the `body` column.
 */
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

    const insert = db.prepare(`INSERT INTO "${collection}" (id, body) VALUES (:id, :body)`);

    const insertMany = db.transaction((documents) => {
        for (const doc of documents) {
            insert.run({ id: String(doc[resourceId]), body: JSON.stringify(doc) });
        }
    });

    insertMany(docs);

    results.success = true;
    results.inserted = docs.length;
    results.body = docs;
    return results;
}
