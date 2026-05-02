import { InternalServerError, NotFoundError } from "../../utils/errors.js";
import { ensureCollection } from "./adapter.js";
import { buildSqlWhere } from "./sqlFilters.js";
import { getResourceId } from "../../utils/helpers.js";

function toDocument(value) {
    return typeof value === "string" ? JSON.parse(value) : value;
}

/**
 * Fetch an embedded sub-resource (array) from a SQLite document.
 */
export async function getSubResource(collection, query, subResource) {
    const db = await ensureCollection(collection);

    if (!query || Object.keys(query).length === 0) {
        throw new InternalServerError(
            "missing_parent_query",
            {},
            { message: "Operation requires a parent resource query" }
        );
    }

    const { sql: whereSql, params } = buildSqlWhere(query);

    let selectSql = `SELECT body FROM ${db.table}`;
    if (whereSql) selectSql += ` WHERE ${whereSql}`;
    selectSql += " LIMIT 1";

    const selected = await db.pool.query(selectSql, params);
    const row = selected.rows[0];

    if (!row) {
        throw new NotFoundError({ message: "Parent resource not found" });
    }

    const parentDoc = toDocument(row.body);
    return Array.isArray(parentDoc[subResource]) ? parentDoc[subResource] : [];
}

/**
 * Replace (overwrite) a sub-resource array on the parent document.
 */
export async function saveSubResource(collection, parentQuery, parentUpdates, subResource, updatedItems) {
    const db = await ensureCollection(collection);
    const resourceId = getResourceId(collection);

    const { sql: whereSql, params } = buildSqlWhere(parentQuery);

    let selectSql = `SELECT id, body FROM ${db.table}`;
    if (whereSql) selectSql += ` WHERE ${whereSql}`;
    selectSql += " LIMIT 1";

    const selected = await db.pool.query(selectSql, params);
    const row = selected.rows[0];

    if (!row) {
        return { success: false, updated: 0, body: null };
    }

    const doc = toDocument(row.body);
    doc[subResource] = updatedItems;

    if (parentUpdates && typeof parentUpdates === "object") {
        Object.assign(doc, parentUpdates);
    }

    const nextId = doc[resourceId] === undefined ? row.id : String(doc[resourceId]);

    await db.pool.query(
        `UPDATE ${db.table} SET id = $1, body = $2::jsonb WHERE id = $3`,
        [nextId, JSON.stringify(doc), row.id]
    );

    return {
        success: true,
        updated: 1,
        body: doc
    };
}
