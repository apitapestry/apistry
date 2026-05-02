import { getDb } from "./adapter.js";

export async function dbGet(collection, filter = {}, options = {}) {
    const db = getDb(collection);

    let cursor = db.find(filter);

    if (options.sort) cursor = cursor.sort(options.sort);
    if (options.offset) cursor = cursor.skip(options.offset);
    if (options.limit) cursor = cursor.limit(options.limit);

    return cursor.toArray();
}
