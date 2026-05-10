import { ensureCollection } from "./adapter.js";
import { buildSortAccessor, buildSqlWhere } from "./sqlFilters.js";

function parseLimitOffset(value) {
    if (value === undefined || value === null) return null;
    const parsed = Number.parseInt(String(value), 10);
    if (!Number.isFinite(parsed) || parsed < 0) return null;
    return parsed;
}

/**
 * Fetch documents from a SQLite table.
 *
 * @param {string} collection  - table name
 * @param {object} filter      - NeDB-style filter (built by buildFilters)
 * @param {object} options     - { sort, offset, limit }
 * @returns {Promise<object[]>}
 */
export async function dbGet(collection, filter = {}, options = {}) {
    const db = await ensureCollection(collection);
    const { sql: whereSql, params } = buildSqlWhere(filter);

    let sql = `SELECT body FROM ${db.table}`;
    if (whereSql) sql += ` WHERE ${whereSql}`;

    // ORDER BY
    if (options.sort && Object.keys(options.sort).length > 0) {
        const orderParts = Object.entries(options.sort).map(([field, dir]) => {
            const safeDir = dir === -1 || String(dir).toLowerCase() === "desc" ? "DESC" : "ASC";
            return `${buildSortAccessor(field)} ${safeDir}`;
        });
        sql += ` ORDER BY ${orderParts.join(", ")}`;
    }

    const limit = parseLimitOffset(options.limit);
    if (limit !== null) {
        params.push(limit);
        sql += ` LIMIT $${params.length}`;
    }

    const offset = parseLimitOffset(options.offset);
    if (offset !== null) {
        params.push(offset);
        sql += ` OFFSET $${params.length}`;
    }

    const result = await db.pool.query(sql, params);
    return result.rows.map(row => (typeof row.body === "string" ? JSON.parse(row.body) : row.body));
}
