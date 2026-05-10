import { ensureCollection } from "./adapter.js";
import { buildFilters } from "../../utils/filters.js";
import { buildSqlWhere } from "./sqlFilters.js";

function toDocument(value) {
    return typeof value === "string" ? JSON.parse(value) : value;
}

/**
 * Delete all documents matching the query.
 * Returns the deleted documents before removal (mirrors NeDB behaviour).
 */
export async function dbDelete(collection, query = {}) {
    const db = await ensureCollection(collection);

    // Build top-level filters exactly as before
    const filters = buildFilters(collection, collection, query);
    const results = { operation: "deleteMany" };

    const { sql: whereSql, params } = buildSqlWhere(filters);

    let selectSql = `SELECT body FROM ${db.table}`;
    if (whereSql) selectSql += ` WHERE ${whereSql}`;

    const selected = await db.pool.query(selectSql, params);
    results.body = selected.rows.map(row => toDocument(row.body));

    // ── Delete ───────────────────────────────────────────────────────────────
    let deleteSql = `DELETE FROM ${db.table}`;
    if (whereSql) deleteSql += ` WHERE ${whereSql}`;

    const deleted = await db.pool.query(deleteSql, params);

    results.success = true;
    results.deleted = deleted.rowCount;

    return results;
}
