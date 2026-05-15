import { getDb } from "./adapter.js";
import { buildSqlWhere } from "./sqlFilters.js";

/**
 * Fetch documents from a SQLite table.
 *
 * @param {string} collection  - table name
 * @param {object} filter      - NeDB-style filter (built by buildFilters)
 * @param {object} options     - { sort, offset, limit }
 * @returns {Promise<object[]>}
 */
export async function dbGet(collection, filter = {}, options = {}) {
    const db = getDb(collection);

    const { sql: whereSql, params } = buildSqlWhere(filter);

    let sql = `SELECT body FROM "${collection}"`;
    if (whereSql) sql += ` WHERE ${whereSql}`;

    // ORDER BY
    if (options.sort && Object.keys(options.sort).length > 0) {
        const orderParts = Object.entries(options.sort).map(([field, dir]) => {
            const safeDir = dir === -1 || String(dir).toLowerCase() === "desc" ? "DESC" : "ASC";
            return `json_extract(body, '$.${field}') ${safeDir}`;
        });
        sql += ` ORDER BY ${orderParts.join(", ")}`;
    }

    if (options.limit)  sql += ` LIMIT  ${parseInt(options.limit,  10)}`;
    if (options.offset) sql += ` OFFSET ${parseInt(options.offset, 10)}`;

    const rows = db.prepare(sql).all(params);
    return rows.map(r => JSON.parse(r.body));
}
