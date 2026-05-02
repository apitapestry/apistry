import { getDb } from "./adapter.js";
import { buildFilters } from "../../utils/filters.js";
import { buildSqlWhere } from "./sqlFilters.js";

/**
 * Delete all documents matching the query.
 * Returns the deleted documents before removal (mirrors NeDB behaviour).
 */
export async function dbDelete(collection, query = {}) {
    const db = getDb(collection);

    // Build top-level filters exactly as before
    const filters = buildFilters(collection, collection, query);

    const results = { operation: "deleteMany" };

    // ── Fetch before delete ──────────────────────────────────────────────────
    const { sql: whereSql, params } = buildSqlWhere(filters);

    let selectSql = `SELECT body FROM "${collection}"`;
    if (whereSql) selectSql += ` WHERE ${whereSql}`;

    const rows = db.prepare(selectSql).all(params);
    results.body = rows.map(r => JSON.parse(r.body));

    // ── Delete ───────────────────────────────────────────────────────────────
    let deleteSql = `DELETE FROM "${collection}"`;
    if (whereSql) deleteSql += ` WHERE ${whereSql}`;

    const info = db.prepare(deleteSql).run(params);

    results.success = true;
    results.deleted = info.changes;

    return results;
}
