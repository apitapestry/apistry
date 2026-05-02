import pluralize from 'pluralize';

/**
 * Unified filter builder.
 *
 * isQuery = true  → top-level or $pull filters, uses query operators
 * isQuery = false → aggregation expressions ($regexMatch, $eq: [..])
 */
export function getFilter(prop, rawValue, propPath = null, isQuery = true, schemaHint = undefined) {
    const isMain = (propPath === null);
    let op = "eq";
    let keyValue = rawValue;

    // ─────────────────────────────────────────────
    // Extract operator prefix (e.g. "gt.50", "between.10,20")
    // ─────────────────────────────────────────────
    if (typeof keyValue === "string") {
        const dot = keyValue.indexOf(".");
        if (dot > 0) {
            const maybeOp = keyValue.substring(0, dot).toLowerCase();
            if (["eq", "neq", "gt", "lt", "gte", "lte", "in", "nin", "between"].includes(maybeOp)) {
                op = maybeOp;
                keyValue = keyValue.substring(dot + 1);
            }
        }
    }

    // Typed conversion (dates, numbers, etc.)
    let cv = detectAndConvertType(keyValue, schemaHint);
    keyValue = cv.value;
    let type = cv.type;

    // For range/comparison operators the schemaHint reflects the *query parameter*
    // type – often "string" so OpenAPI accepts operator prefixes like "gt.", "between.",
    // etc. – not the underlying data field type.  When the schema forces type to
    // "string" but the raw value is actually numeric or date-like, re-detect
    // heuristically so comparisons produce correctly-typed filter values across all
    // database backends (SQLite integer/text type-ordering, MongoDB BSON types, etc.).
    const isRangeOp = ["gt", "lt", "gte", "lte", "between"].includes(op);
    if (isRangeOp && type === "string") {
        const heuristic = detectAndConvertType(String(keyValue)); // no schema hint
        if (heuristic.type !== "string") {
            cv = heuristic;
            keyValue = heuristic.value;
            type = heuristic.type;
        }
    }

    // Helper: wrap aggregation expression when not query mode
    const expr = (obj) => (isQuery ? obj : { $expr: obj });

    // ─────────────────────────────────────────────
    // Special strings: ISNULL, ISNOTNULL, wildcard *
    // ─────────────────────────────────────────────
    if (typeof keyValue === "string") {
        const lower = keyValue.toLowerCase();

        if (lower === "isnull") {
            if (isMain) return { $in: [null, ""] };
            return expr({ $or: [{ $eq: [propPath, null] }, { $eq: [propPath, ""] }] });
        }

        if (lower === "isnotnull") {
            if (isMain) return { $nin: [null, ""] };
            return expr({ $and: [{ $ne: [propPath, null] }, { $ne: [propPath, ""] }] });
        }

        // Wildcard syntax → regex
        if (keyValue.includes("*")) {
            let pattern = keyValue.replace(/\*/g, ".*");
            if (!keyValue.startsWith("*")) pattern = "^" + pattern;
            if (!keyValue.endsWith("*")) pattern = pattern + "$";

            if (isMain) {
                // NeDB expects $regex to be a RegExp, not a string.
                return { $regex: new RegExp(pattern, "i") };
            }

            return expr({
                $regexMatch: { input: propPath, regex: pattern, options: "i" }
            });
        }
    }

    // ─────────────────────────────────────────────
    // Main operator logic
    // ─────────────────────────────────────────────

    switch (op) {
        case "eq": {
            if (type === "dateOnly") {
                const pattern = `^${keyValue}`;
                return isMain
                    ? { $regex: new RegExp(pattern, "i") }
                    : expr({ $regexMatch: { input: propPath, regex: pattern, options: "i" } });
            }
            return isMain ? keyValue : expr({ $eq: [propPath, keyValue] });
        }

        case "neq": {
            if (type === "dateOnly") {
                const pattern = `^${keyValue}`;
                return isMain
                    ? { $not: { $regex: new RegExp(pattern, "i") } }
                    : expr({ $not: { $regexMatch: { input: propPath, regex: pattern, options: "i" } } });
            }
            return isMain
                ? { $ne: keyValue }
                : expr({ $ne: [propPath, keyValue] });
        }

        case "gt": {
            const v = type === "dateOnly" ? cv.paddedStart : keyValue;
            return isMain ? { $gt: v } : expr({ $gt: [propPath, v] });
        }

        case "lt": {
            const v = type === "dateOnly" ? cv.paddedEnd : keyValue;
            return isMain ? { $lt: v } : expr({ $lt: [propPath, v] });
        }

        case "gte": {
            const v = type === "dateOnly" ? cv.paddedStart : keyValue;
            return isMain ? { $gte: v } : expr({ $gte: [propPath, v] });
        }

        case "lte": {
            const v = type === "dateOnly" ? cv.paddedEnd : keyValue;
            return isMain ? { $lte: v } : expr({ $lte: [propPath, v] });
        }

        case "in": {
            const values = parseInList(keyValue, schemaHint);
            return isMain ? { $in: values } : expr({ $in: [propPath, values] });
        }

        case "nin": {
            const values = parseInList(keyValue, schemaHint);
            return isMain ? { $nin: values } : expr({ $not: { $in: [propPath, values] } });
        }

        case "between": {
            // Parse two parameters, e.g. "between.10,20"
            let values = [];
            if (typeof keyValue === "string") {
                values = keyValue.split(",").map(v => v.trim()).filter(v => v !== "");
            } else if (Array.isArray(keyValue)) {
                values = keyValue;
            }
            if (values.length !== 2) return undefined;
            // Use heuristic type detection for the individual bound values (no schema
            // hint) so that a query parameter defined as type:string still produces
            // correctly-typed numeric/date filter values across all database backends.
            const hint = normalizeSchemaHint(schemaHint);
            const betweenHint = (hint?.schemaType === "string") ? undefined : schemaHint;
            const cv1 = detectAndConvertType(values[0], betweenHint);
            const cv2 = detectAndConvertType(values[1], betweenHint);
            const v1 = cv1.value;
            const v2 = cv2.value;
            // Ensure v1 <= v2
            if (v1 > v2) return undefined;
            // For dateOnly, use paddedStart/paddedEnd
            let start = v1;
            let end = v2;
            if (cv1.type === "dateOnly" && cv2.type === "dateOnly") {
                start = cv1.paddedStart;
                end = cv2.paddedEnd;
            }
            if (isMain) {
                return { $gte: start, $lte: end };
            } else {
                return expr({ $and: [
                    { $gte: [propPath, start] },
                    { $lte: [propPath, end] }
                ] });
            }
        }

        default:
            return undefined;
    }
}

function normalizeSchemaHint(schemaHint) {
    if (!schemaHint) return undefined;
    if (typeof schemaHint === "string") return { schemaType: schemaHint };
    return schemaHint;
}

function detectAndConvertType(value, schemaHint = undefined) {
    if (value === null) {
        return { type: "null", value: null };
    }

    if (value === "") {
        return { type: "empty", value: "" };
    }

    const hint = normalizeSchemaHint(schemaHint);
    const schemaType = hint?.schemaType;
    const schemaFormat = hint?.schemaFormat;

    // Only strings can be meaningfully parsed using format.
    const raw = value;

    // Contract-driven conversions first.
    if (schemaType) {
        // OpenAPI: type: string, format: date
        if (schemaType === "string" && schemaFormat === "date" && typeof raw === "string") {
            const dateOnlyRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (dateOnlyRegex.test(raw)) {
                const start = new Date(raw + "T00:00:00.000Z").toISOString();
                const end = new Date(raw + "T23:59:59.999Z").toISOString();

                return {
                    type: "dateOnly",
                    value: raw,
                    paddedStart: start,
                    paddedEnd: end
                };
            }
            // If format says date but value isn't date-only, keep as string.
            return { type: "string", value: String(raw) };
        }

        if (schemaType === "string") {
            return { type: "string", value: typeof raw === "string" ? raw : String(raw) };
        }

        if (schemaType === "boolean") {
            if (typeof raw === "boolean") return { type: "boolean", value: raw };
            if (raw === "true" || raw === "false") {
                return { type: "boolean", value: raw === "true" };
            }
            // Unknown boolean literal; keep as-is.
            return { type: "boolean", value: raw };
        }

        if (schemaType === "number" || schemaType === "integer") {
            if (typeof raw === "number") return { type: "number", value: raw };
            if (typeof raw === "string" && raw.trim() !== "" && !isNaN(raw)) {
                const n = Number(raw);
                return { type: "number", value: schemaType === "integer" ? Math.trunc(n) : n };
            }
            // Can't coerce; keep as-is.
            return { type: "number", value: raw };
        }

        if (schemaType === "null") {
            return { type: "null", value: null };
        }
        // For object/array/etc, don't coerce here.
    }

    // ─────────────────────────────────────────────
    // Heuristic conversion (backward compatible)
    // ─────────────────────────────────────────────

    // Boolean?
    if (raw === "true" || raw === "false") {
        return {
            type: "boolean",
            value: raw === "true"
        };
    }

    // Null literal?
    if (raw === "null") {
        return { type: "null", value: null };
    }

    // Number? (no trailing letters)
    if (!isNaN(raw) && typeof raw === "string" && raw.trim() !== "") {
        return {
            type: "number",
            value: Number(raw)
        };
    }

    // DATE ONLY (YYYY-MM-DD)
    const dateOnlyRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (typeof raw === "string" && dateOnlyRegex.test(raw)) {
        const start = new Date(raw + "T00:00:00.000Z").toISOString();
        const end = new Date(raw + "T23:59:59.999Z").toISOString();

        return {
            type: "dateOnly",
            value: raw,          // used for regex ^YYYY-MM-DD
            paddedStart: start,  // used for >=
            paddedEnd: end       // used for <=
        };
    }

    // Default: treat as string
    return {
        type: "string",
        value: raw
    };
}

function parseInList(value, schemaHint = undefined) {
    let raw = value;

    // Strip brackets: "[a,b,c]" → "a,b,c"
    if (typeof raw === "string" && raw.startsWith("[") && raw.endsWith("]")) {
        raw = raw.substring(1, raw.length - 1);
    }

    // Split by commas
    const parts = String(raw).split(",").map(s => s.trim()).filter(s => s !== "");

    // Convert each item using detectAndConvertType
    return parts.map(v => detectAndConvertType(v, schemaHint).value);
}

/**
 * Build a canonical (Mongo-like) filter object from a request query.
 *
 * This is the shared "gold standard" filter language used by Apistry.
 * Database adapters may translate this canonical filter into a native query
 * format if needed.
 *
 * Includes:
 *   - plural→singular rewrite (cars.carId vs carId)
 *   - array values → {$in: [...]}
 *   - schema-hinted coercion via getFilter
 *   - filterKey / retParentKeyOnly behavior
 */
export function buildFilters(collection, resource, query, filterKey = undefined, retParentKeyOnly = true, ctx = {}) {
    const resourceId = pluralize.singular(resource);
    const filter = {};
    const schemaHints = ctx?.schema;

    for (let [key, value] of Object.entries(query ?? {})) {
        // Ignore "collection"
        if (key === 'collection') continue;

        // plural->singular "cars" => "car"
        if (key === resource) {
            key = resourceId;
        }

        // If value is array, force $in (and coerce items if schema hint exists)
        if (Array.isArray(value)) {
            const hint = schemaHints?.[key];
            filter[key] = { $in: hint ? value.map(v => getFilter(key, v, null, true, hint)) : value };
            continue;
        }

        // unified filter (query mode)
        const hint = schemaHints?.[key];
        const f = getFilter(key, value, null, true, hint); // isQuery=true

        if (f !== undefined) {
            filter[key] = f;
            continue;
        }

        // fallback passthrough
        filter[key] = value;
    }

    // Optional: return only specific key's filter
    if (filterKey) {
        if (retParentKeyOnly) {
            return { [filterKey]: filter[filterKey] };
        } else {
            const copy = JSON.parse(JSON.stringify(filter));
            delete copy[filterKey];
            return copy;
        }
    }

    return filter;
}
