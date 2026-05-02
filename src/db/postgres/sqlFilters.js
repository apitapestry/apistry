/**
 * sqlFilters.js
 *
 * Translates the canonical NeDB-style filter objects produced by
 * buildFilters() / getFilter() into parameterised PostgreSQL WHERE clauses
 * that operate on the `body` JSONB column via jsonb_extract_path_text().
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
 *   { $regex }         → ILIKE
 *   { $not }           → NOT (inner)
 *   { $and }           → AND
 *   { $or  }           → OR
 *   null / ISNULL      → IS NULL
 *   ISNOTNULL          → IS NOT NULL
 *
 * DB-specific notes (vs sqlite/sqlFilters.js):
 *   - Parameters are positional ($1, $2 …) and collected into an array.
 *   - jsonb_extract_path_text() always returns TEXT, so all filter values are
 *     normalised to strings via normalizeScalar() before binding.
 *   - Field names themselves are also bound as positional parameters.
 *   - Case-insensitive LIKE uses the native ILIKE operator.
 */

/**
 * Build a parameterised WHERE clause from a NeDB-style filter.
 *
 * @param {object} filter
 * @returns {{ sql: string, params: Array }}
 *   sql    – the WHERE expression (without the "WHERE" keyword), may be empty string
 *   params – positional parameter array for node-postgres `.query(sql, params)`
 */
export function buildSqlWhere(filter = {}) {
    const params = [];
    const sql = buildExpression(filter, params);
    return {
        sql: sql || "",
        params
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

function nextParam(params, value) {
    params.push(value);
    return `$${params.length}`;
}

function normalizeScalar(value) {
    if (value === null || value === undefined) return value;
    if (value instanceof Date) return value.toISOString();
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
}

function toJsonPathParts(field) {
    return String(field)
        .split(".")
        .map(part => part.trim())
        .filter(Boolean);
}

function buildJsonTextAccessor(field, params) {
    const parts = toJsonPathParts(field);
    if (parts.length === 0) {
        return "NULL";
    }

    const placeholders = parts.map(part => nextParam(params, part));
    return `jsonb_extract_path_text(body, ${placeholders.join(", ")})`;
}

export function buildSortAccessor(field) {
    const parts = toJsonPathParts(field).map(part => part.replace(/"/g, '""'));

    if (parts.length === 0) {
        return "NULL";
    }

    return `body #>> '{${parts.join(",")}}'`;
}

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

function buildFieldCondition(col, value, params) {
    if (value === null) {
        return `${col} IS NULL`;
    }

    if (typeof value !== "object" || value instanceof RegExp) {
        if (value instanceof RegExp) {
            return buildRegexCondition(col, value, params);
        }
        const p = nextParam(params, normalizeScalar(value));
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
            const p = nextParam(params, normalizeScalar(value.$ne));
            clauses.push(`(${col} IS NULL OR ${col} != ${p})`);
        }
    }

    const compMap = { $gt: ">", $gte: ">=", $lt: "<", $lte: "<=" };
    for (const [op, sym] of Object.entries(compMap)) {
        if (ops.includes(op)) {
            const p = nextParam(params, normalizeScalar(value[op]));
            clauses.push(`${col} ${sym} ${p}`);
        }
    }

    if (ops.includes("$eq")) {
        const eqVal = value.$eq;
        if (eqVal === null) {
            clauses.push(`${col} IS NULL`);
        } else {
            const p = nextParam(params, normalizeScalar(eqVal));
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
    return caseInsensitive ? `${col} ILIKE ${p}` : `${col} LIKE ${p}`;
}

function buildInCondition(col, values, params, negate) {
    if (!Array.isArray(values) || values.length === 0) {
        return negate ? "1=1" : "1=0";
    }

    const hasNull = values.some(v => v === null);
    const nonNulls = values.filter(v => v !== null).map(normalizeScalar);

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
