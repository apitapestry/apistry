import { ensureCollection } from "./adapter.js";
import { buildSqlWhere } from "./sqlFilters.js";
import { getResourceId } from "../../utils/helpers.js";

function toDocument(value) {
    return typeof value === "string" ? JSON.parse(value) : value;
}

/**
 * Update a single matching document.
 *
 * Applies $set (merge fields) and $unset (remove fields) to the JSON body,
 * then writes the result back. Matches NeDB's single-document update behaviour.
 *
 * @param {string} collection
 * @param {object} query   - NeDB-style filter (selects which row to update)
 * @param {object} set     - fields to set   { field: value, ... }
 * @param {object} unset   - fields to remove { field: 1, ... }
 */
export async function dbUpdate(collection, query, set = {}, unset = {}) {
    const db = await ensureCollection(collection);
    const resourceId = getResourceId(collection);

    const hasSet   = set   && Object.keys(set).length   > 0;
    const hasUnset = unset && Object.keys(unset).length > 0;

    if (!hasSet && !hasUnset) {
        return { operation: "update", success: false, updated: 0, body: null };
    }

    // ── Find the first matching row ───────────────────────────────────────────
    const { sql: whereSql, params } = buildSqlWhere(query);
    let selectSql = `SELECT id, body FROM ${db.table}`;
    if (whereSql) selectSql += ` WHERE ${whereSql}`;
    selectSql += " LIMIT 1";

    const selected = await db.pool.query(selectSql, params);
    const row = selected.rows[0];

    if (!row) {
        return { operation: "update", success: false, updated: 0, body: null };
    }

    // ── Apply patch ───────────────────────────────────────────────────────────
    const doc = toDocument(row.body);

    if (hasSet) {
        Object.assign(doc, set);
    }

    if (hasUnset) {
        for (const field of Object.keys(unset)) {
            delete doc[field];
        }
    }

    const nextId = doc[resourceId] === undefined
        ? row.id
        : String(doc[resourceId]);

    // ── Write back ────────────────────────────────────────────────────────────
    await db.pool.query(
        `UPDATE ${db.table} SET id = $1, body = $2::jsonb WHERE id = $3`,
        [nextId, JSON.stringify(doc), row.id]
    );

    return {
        operation: "update",
        success: true,
        updated: 1,
        body: doc
    };
}
