import { getDb } from "./adapter.js";
import { buildFilters } from "../../utils/filters.js";

export async function dbDelete(collection, query = {}) {
    const col = getDb(collection);

    // Build top-level filters exactly as before
    const filters = buildFilters(collection, collection, query);

    const results = { operation: "deleteMany" };

    // Fetch before delete if needed
    const docs = await col.find(filters).toArray();
    results.body = docs.map(d => JSON.parse(JSON.stringify(d))); // safe clone

    // Perform delete
    const resp = await col.deleteMany(filters);

    results.success = true;
    results.deleted = resp.deletedCount;

    return results;
}
