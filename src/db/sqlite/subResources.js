import { InternalServerError, NotFoundError } from "../../utils/errors.js";
import { getDb } from "./adapter.js";
import { buildSqlWhere } from "./sqlFilters.js";
import { getResourceId } from "../../utils/helpers.js";

/**
 * Fetch an embedded sub-resource (array) from a SQLite document.
 */
export async function getSubResource(collection, query, subResource) {
    const db = getDb(collection);

    if (!query || Object.keys(query).length === 0) {
        throw new InternalServerError("Operation requires a parent resource query");
    }

    // ── Find the parent document ─────────────────────────────────────────────
    const { sql: whereSql, params } = buildSqlWhere(query);

    let selectSql = `SELECT body FROM "${collection}"`;
    if (whereSql) selectSql += ` WHERE ${whereSql}`;
    selectSql += " LIMIT 1";

    const row = db.prepare(selectSql).get(params);

    if (!row) {
        throw new NotFoundError("Parent resource not found");
    }

    const parentDoc = JSON.parse(row.body);

    return Array.isArray(parentDoc[subResource]) ? parentDoc[subResource] : [];
}

/**
 * Replace (overwrite) a sub-resource array on the parent document.
 */
export async function saveSubResource(collection, parentQuery, parentUpdates, subResource, updatedItems) {
    const db = getDb(collection);
    const resourceId = getResourceId(collection);

    const { sql: whereSql, params } = buildSqlWhere(parentQuery);

    let selectSql = `SELECT rowid, id, body FROM "${collection}"`;
    if (whereSql) selectSql += ` WHERE ${whereSql}`;
    selectSql += " LIMIT 1";

    const row = db.prepare(selectSql).get(params);

    if (!row) {
        return { success: false, updated: 0, body: null };
    }

    const doc = JSON.parse(row.body);

    // Apply sub-resource update
    doc[subResource] = updatedItems;

    // Apply any extra parent-level field updates
    if (parentUpdates && typeof parentUpdates === "object") {
        Object.assign(doc, parentUpdates);
    }

    const nextId = doc[resourceId] === undefined
        ? row.id
        : String(doc[resourceId]);

    db.prepare(`UPDATE "${collection}" SET id = ?, body = ? WHERE rowid = ?`)
      .run(nextId, JSON.stringify(doc), row.rowid);

    return {
        success: true,
        updated: 1,
        body: doc
    };
}
