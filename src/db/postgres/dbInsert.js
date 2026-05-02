import { ensureCollection } from "./adapter.js";
import { getResourceId } from "../../utils/helpers.js";

/**
 * Insert one or many documents into the SQLite table.
 *
 * The `id` column is populated from the document's <singular>Id field
 * (e.g. carId for the `cars` table). The full JSON document is stored
 * in the `body` column.
 */
export async function dbInsert(collection, body) {
    const db = await ensureCollection(collection);
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

    const values = [];
    const placeholders = docs.map((doc, index) => {
        const idPos = index * 2 + 1;
        const bodyPos = index * 2 + 2;
        values.push(String(doc[resourceId]), JSON.stringify(doc));
        return `($${idPos}, $${bodyPos}::jsonb)`;
    });

    const sql = `INSERT INTO ${db.table} (id, body) VALUES ${placeholders.join(", ")}`;
    await db.pool.query(sql, values);

    results.success = true;
    results.inserted = docs.length;
    results.body = docs;
    return results;
}
