import { getDb } from "./adapter.js";
import { buildFilters } from "../../utils/filters.js";

export async function dbCount(collection, query = {}, ctx = {}) {
    const db = getDb(collection);
    const filter = buildFilters(collection, collection, query, undefined, true, ctx);

    return await db.countDocuments(filter);
}
