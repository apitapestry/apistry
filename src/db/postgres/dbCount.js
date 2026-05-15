import { ensureCollection } from "./adapter.js";
import { buildFilters } from "../../utils/filters.js";
import { buildSqlWhere } from "./sqlFilters.js";

/**
 * Count documents in a SQLite table matching the given query.
 */
export async function dbCount(collection, query = {}, ctx = {}) {
    const db = await ensureCollection(collection);
    const filter = buildFilters(collection, collection, query, undefined, true, ctx);

    const { sql: whereSql, params } = buildSqlWhere(filter);

    let sql = `SELECT COUNT(*)::int AS cnt FROM ${db.table}`;
    if (whereSql) sql += ` WHERE ${whereSql}`;

    const result = await db.pool.query(sql, params);
    return result.rows[0]?.cnt ?? 0;
}
