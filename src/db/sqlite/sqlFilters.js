/**
 * sqlFilters.js
 *
 * Translates the canonical NeDB-style filter objects produced by
 * buildFilters() / getFilter() into parameterised SQLite WHERE clauses
 * that operate on the `body` JSON column via json_extract().
 *
 * Supported operators (mirrors NeDB / Mongo query syntax):
 *   plain value        → equality
 *   { $eq  }           → =
 *   { $ne  }           → !=
 *   { $gt  }           → >
 *   { $gte }           → >=
 *   { $lt  }           → <
 *   { $lte }           → <=
 *   { $in  }           → IN (...)
 *   { $nin }           → NOT IN (...)
 *   { $regex }         → LIKE (with ^ / $ anchor awareness)
 *   { $not }           → NOT (inner)
 *   { $and }           → AND
 *   { $or  }           → OR
 *   null / ISNULL      → IS NULL
 *   ISNOTNULL          → IS NOT NULL
 *
 * DB-specific notes (vs postgres/sqlFilters.js):
 *   - Parameters are named  (:p0, :p1 …)  and collected into a plain object.
 *   - json_extract() returns the native JSON type (integer, real, text …).
 *     Filter values must therefore be passed as their native JS type so that
 *     SQLite's type-affinity comparison rules work correctly.
 *   - Case-insensitive LIKE uses LOWER() on both sides (SQLite has no ILIKE).
 */

/**
 * Build a parameterised WHERE clause from a NeDB-style filter.
 *
 * @param {object} filter
 * @returns {{ sql: string, params: object }}
 *   sql    – the WHERE expression (without the "WHERE" keyword), may be empty string
 *   params – named parameter object for better-sqlite3 `.all(params)` / `.run(params)`
 */
export function buildSqlWhere(filter = {}) {
    const params = {};
    // Reset for deterministic parameter names and to avoid unbounded growth.
    _paramCounter = 0;
    const sql = buildExpression(filter, params);
    return {
        sql: sql || "",
        params
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

let _paramCounter = 0;
function nextParam(params, value) {
    const key = `p${_paramCounter++}`;
    params[key] = value;
    return `:${key}`;
}

/**
 * Returns the SQL expression that extracts `field` from the `body` JSON column.
 * The `_params` argument is accepted (and ignored) so the signature matches the
 * Postgres counterpart, allowing buildExpression to call both identically.
 */
function buildJsonTextAccessor(field, _params) {
    return `json_extract(body, '$.${field}')`;
}

/**
 * Returns the SQL expression used in ORDER BY clauses for `field`.
 * Exported so callers (dbGet, etc.) can build sort expressions consistently.
 */
export function buildSortAccessor(field) {
    return `json_extract(body, '$.${field}')`;
}

/**
 * Recursively build an array of SQL condition strings for the given filter,
 * collecting bound parameters into `params`.
 */
function buildExpression(filter, params) {
    const parts = [];

    for (const [key, value] of Object.entries(filter || {})) {
        if (key === "$and") {
            if (!Array.isArray(value) || value.length === 0) {
                continue;
            }

            const grouped = value
                .map(sub => buildExpression(sub, params))
                .filter(Boolean)
                .map(expr => `(${expr})`);

            if (grouped.length > 0) {
                parts.push(grouped.join(" AND "));
            }
            continue;
        }

        if (key === "$or") {
            if (!Array.isArray(value) || value.length === 0) {
                continue;
            }

            const grouped = value
                .map(sub => buildExpression(sub, params))
                .filter(Boolean)
                .map(expr => `(${expr})`);

            if (grouped.length > 0) {
                parts.push(`(${grouped.join(" OR ")})`);
            }
            continue;
        }

        const col = buildJsonTextAccessor(key, params);
        const cond = buildFieldCondition(col, value, params);
        if (cond) {
            parts.push(cond);
        }
    }

    return parts.join(" AND ");
}

/**
 * Build a SQL condition for a single field + value pair.
 * `value` may be a plain scalar or an operator object like { $gt: 5 }.
 */
function buildFieldCondition(col, value, params) {
    if (value === null) {
        return `${col} IS NULL`;
    }

    if (typeof value !== "object" || value instanceof RegExp) {
        if (value instanceof RegExp) {
            return buildRegexCondition(col, value, params);
        }
        const p = nextParam(params, value);
        return `${col} = ${p}`;
    }

    const ops = Object.keys(value);
    const clauses = [];

    if (ops.includes("$regex")) {
        clauses.push(buildRegexCondition(col, value.$regex, params));
    }

    if (ops.includes("$not")) {
        const inner = buildFieldCondition(col, value.$not, params);
        if (inner) {
            clauses.push(`NOT (${inner})`);
        }
    }

    if (ops.includes("$in")) {
        clauses.push(buildInCondition(col, value.$in, params, false));
    }

    if (ops.includes("$nin")) {
        clauses.push(buildInCondition(col, value.$nin, params, true));
    }

    if (ops.includes("$ne")) {
        if (value.$ne === null) {
            clauses.push(`${col} IS NOT NULL`);
        } else {
            const p = nextParam(params, value.$ne);
            // Match NeDB: $ne also matches missing fields.
            clauses.push(`(${col} IS NULL OR ${col} != ${p})`);
        }
    }

    const compMap = { $gt: ">", $gte: ">=", $lt: "<", $lte: "<=" };
    for (const [op, sym] of Object.entries(compMap)) {
        if (ops.includes(op)) {
            const p = nextParam(params, value[op]);
            clauses.push(`${col} ${sym} ${p}`);
        }
    }

    if (ops.includes("$eq")) {
        const eqVal = value.$eq;
        if (eqVal === null) {
            clauses.push(`${col} IS NULL`);
        } else {
            const p = nextParam(params, eqVal);
            clauses.push(`${col} = ${p}`);
        }
    }

    if (clauses.length > 0) {
        return clauses.length === 1 ? clauses[0] : `(${clauses.join(" AND ")})`;
    }

    try {
        const p = nextParam(params, JSON.stringify(value));
        return `${col} = ${p}`;
    } catch {
        return null;
    }
}

function buildRegexCondition(col, pattern, params) {
    const regex = pattern instanceof RegExp ? pattern : new RegExp(String(pattern));
    let source = regex.source;
    const caseInsensitive = regex.flags.includes("i");

    const isAnchoredStart = source.startsWith("^");
    const isAnchoredEnd = source.endsWith("$") && !source.endsWith("\\$");

    if (isAnchoredStart) source = source.slice(1);
    if (isAnchoredEnd) source = source.slice(0, -1);

    let likePattern = source
        .replace(/\.\*/g, "%")
        .replace(/\./g, "_");

    if (!isAnchoredStart) likePattern = `%${likePattern}`;
    if (!isAnchoredEnd) likePattern = `${likePattern}%`;

    const p = nextParam(params, likePattern);
    if (caseInsensitive) {
        return `LOWER(${col}) LIKE LOWER(${p})`;
    }

    return `${col} LIKE ${p}`;
}

function buildInCondition(col, values, params, negate) {
    if (!Array.isArray(values) || values.length === 0) {
        return negate ? "1=1" : "1=0";
    }

    const hasNull = values.some(v => v === null);
    const nonNulls = values.filter(v => v !== null);

    if (!negate) {
        const clauses = [];
        if (nonNulls.length > 0) {
            const placeholders = nonNulls.map(v => nextParam(params, v));
            clauses.push(`${col} IN (${placeholders.join(", ")})`);
        }
        if (hasNull) {
            clauses.push(`${col} IS NULL`);
        }
        if (clauses.length === 0) {
            return "1=0";
        }
        return clauses.length === 1 ? clauses[0] : `(${clauses.join(" OR ")})`;
    }

    // Match NeDB: $nin excludes listed values but includes missing fields unless null is listed.
    const clauses = [];
    if (nonNulls.length > 0) {
        const placeholders = nonNulls.map(v => nextParam(params, v));
        clauses.push(`${col} NOT IN (${placeholders.join(", ")})`);
    }

    if (hasNull) {
        clauses.push(`${col} IS NOT NULL`);
    } else {
        clauses.push(`${col} IS NULL`);
    }

    return clauses.length === 1 ? clauses[0] : `(${clauses.join(" OR ")})`;
}
