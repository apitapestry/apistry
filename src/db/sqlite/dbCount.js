import { getDb } from "./adapter.js";
import { buildFilters } from "../../utils/filters.js";
import { buildSqlWhere } from "./sqlFilters.js";

/**
 * Count documents in a SQLite table matching the given query.
 */
export async function dbCount(collection, query = {}, ctx = {}) {
    const db = getDb(collection);
    const filter = buildFilters(collection, collection, query, undefined, true, ctx);

    const { sql: whereSql, params } = buildSqlWhere(filter);

    let sql = `SELECT COUNT(*) as cnt FROM "${collection}"`;
    if (whereSql) sql += ` WHERE ${whereSql}`;

    const row = db.prepare(sql).get(params);
    return row?.cnt ?? 0;
}
