import pluralize from "pluralize";
import { UnprocessableEntityErrorBuilder } from './errors.js';

/**
 * Convert wildcard strings (*abc*) into RegExp
 */
function wildcardToRegex(str) {
    const escaped = str.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
    const pattern = escaped.replace(/\*/g, ".*");
    return new RegExp(pattern, "i");
}

/**
 * Detect type and convert (numbers, booleans, null, dateOnly, datetime).
 */
function detectType(value) {
    if (value === null) return { type: "null", value: null };
    if (value === "") return { type: "empty", value: "" };

    const raw = value;

    // Boolean?
    if (raw === "true" || raw === "false") {
        return { type: "boolean", value: raw === "true" };
    }

    // Number?
    if (!isNaN(raw) && raw.trim() !== "") {
        return { type: "number", value: Number(raw) };
    }

    // Date-only (YYYY-MM-DD)
    const dateOnlyRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (dateOnlyRegex.test(raw)) {
        const start = new Date(raw + "T00:00:00.000Z");
        const end = new Date(raw + "T23:59:59.999Z");
        return {
            type: "dateOnly",
            value: raw,       // string YYYY-MM-DD for "eq" regex behavior
            paddedStart: start,
            paddedEnd: end
        };
    }

    // Datetime (ISO acceptable)
    if (!isNaN(Date.parse(raw))) {
        return { type: "datetime", value: new Date(raw) };
    }

    // Default string
    return { type: "string", value: raw };
}

/**
 * Compare field value vs rule value using unified rules:
 * - dateOnly truncates datetime on actual side
 * - datetime vs datetime compares epoch
 * - numeric compares numbers
 * - string compares lexicographically
 */
function compareValues(actual, ruleValue, ruleType) {
    const actualIsDate = actual instanceof Date || !isNaN(Date.parse(actual));
    const ruleIsDate = ruleValue instanceof Date;

    // DATE or DATETIME comparison?
    if (actualIsDate && ruleIsDate) {
        let a = actual instanceof Date ? actual : new Date(actual);
        let b = ruleValue;

        if (ruleType === "dateOnly") {
            a = new Date(a.getFullYear(), a.getMonth(), a.getDate());
        }

        return a - b; // numeric comparison
    }

    // Numeric comparison
    if (typeof actual === "number" && typeof ruleValue === "number") {
        return actual - ruleValue;
    }

    // String lexicographical
    if (typeof actual === "string" && typeof ruleValue === "string") {
        return actual.localeCompare(ruleValue);
    }

    return NaN; // non-comparable
}

/**
 * Parse rule string → { op, value }
 */
function parseRule(rule) {
    if (rule == null) return { op: "eq", value: null };

    const lower = String(rule).toLowerCase();

    // isnull / isnotnull
    if (lower === "isnull") {
        return { op: "isnull", value: null };
    }

    if (lower === "isnotnull") {
        return { op: "isnotnull", value: null };
    }

    // wildcard
    if (String(rule).includes("*")) {
        return { op: "wild", value: rule };
    }

    // in.x,y
    if (rule.startsWith("in.")) {
        return { op: "in", value: rule.substring(3) };
    }

    // nin.x,y
    if (rule.startsWith("nin.")) {
        return { op: "nin", value: rule.substring(4) };
    }

    // operators: gt.X, gte.X, lt.X, lte.X, eq.X, neq.X
    const dot = rule.indexOf(".");
    if (dot > 0) {
        const op = rule.substring(0, dot).toLowerCase();
        const val = rule.substring(dot + 1);
        return { op, value: val };
    }

    // default = eq
    return { op: "eq", value: rule };
}

/**
 * Build comparison predicate for a single rule
 */
function buildPredicateFromRule(rule) {
    const { op, value } = parseRule(rule);
    const detected = detectType(value);
    const ruleType = detected.type;
    const compVal = detected.value;

    switch (op) {
        case "isnull":
            return v => v == null || v === "";

        case "isnotnull":
            return v => v != null && v !== "";

        case "wild": {
            const regex = wildcardToRegex(value);
            return v => typeof v === "string" && regex.test(v);
        }

        case "in": {
            const list = value
                .split(",")
                .map(s => detectType(s).value);
            return v => list.includes(v);
        }

        case "nin": {
            const list = value
                .split(",")
                .map(s => detectType(s).value);
            return v => !list.includes(v);
        }

        case "gt":
        case "gte":
        case "lt":
        case "lte":
        case "eq": {
            return v => {
                const cmp = compareValues(v, compVal, ruleType);
                if (isNaN(cmp)) return false;

                switch (op) {
                    case "gt": return cmp > 0;
                    case "gte": return cmp >= 0;
                    case "lt": return cmp < 0;
                    case "lte": return cmp <= 0;
                    case "eq": return cmp === 0;
                }
            };
        }

        default:
            return v => valuesMatch(v, compVal);
    }
}

function valuesMatch(actual, expected) {
    if (actual === expected) return true;
    if (actual == null || expected == null) return false;
    return String(actual) === String(expected);
}

/**
 * Predicate for objects inside subresources
 */
export function buildObjectPredicate(query) {
    const rules = Object.entries(query).map(([prop, rule]) => {
        const fn = buildPredicateFromRule(rule);
        return obj => fn(obj[prop]);
    });

    return obj => rules.every(f => f(obj));
}

/**
 * Predicate for primitive arrays
 */
export function buildPrimitivePredicate(rule) {
    const fn = buildPredicateFromRule(rule);
    return val => fn(val);
}

/**
 * Determine proper predicate builder
 */
export function buildSubPredicate(body, query) {
    if (!Array.isArray(body) || body.length === 0) {
        return () => false;
    }

    const sample = body[0];

    // Object array?
    if (typeof sample === "object" && !Array.isArray(sample)) {
        return buildObjectPredicate(query);
    }

    // Primitive array: only 1 rule allowed
    return buildPrimitivePredicate(Object.values(query)[0]);
}

/**
 * Execute subresource filtering
 */
export function filterSubResource(body, query) {
    if (!Array.isArray(body)) return [];
    if (!query || Object.keys(query).length === 0) return body;
    const pred = buildSubPredicate(body, query);
    return body.filter(pred);
}

export function filterSubResourceDel(body, query) {
    if (!Array.isArray(body)) return [];
    if (!query || Object.keys(query).length === 0) return body;

    const pred = buildSubPredicate(body, query);

    // Keep only items that DO NOT match the filter
    return body.filter(item => !pred(item));
}

// -------------------------
// Extract object schemas
// -------------------------
export function getSchema(schema) {
    if (!schema || typeof schema !== "object") return [];

    // OpenAPI requestBody wrapper
    if (schema.content?.["application/json"]?.schema) {
        return getSchema(schema.content["application/json"].schema);
    }

    // Direct object
    if (schema.type === "object" && schema.properties) {
        return [schema];
    }

    // Array of items
    if (schema.type === "array" && schema.items) {
        return getSchema(schema.items);
    }

    // oneOf/anyOf/allOf
    for (const key of ["oneOf", "anyOf", "allOf"]) {
        if (Array.isArray(schema[key])) {
            return schema[key]
                .flatMap(s => getSchema(s))
                .filter(s => s?.type === "object");
        }
    }

    return [];
}

export function getParentSchema(req, collection) {
    const openapiSpec = req.server.openapiSpec;
    if (!openapiSpec?.components?.schemas) {
        UnprocessableEntityErrorBuilder.throwOne({
            message: 'OpenAPI schemas missing'
        });
    }

    const singular = pluralize.singular(collection);
    const schemaName =
        singular.charAt(0).toUpperCase() + singular.slice(1);

    const schema = openapiSpec.components.schemas[schemaName];

    if (!schema) {
        UnprocessableEntityErrorBuilder.throwOne({
            message: 'Schema not found',
            objectName: schemaName
        });
    }

    if (schema.type !== "object") {
        UnprocessableEntityErrorBuilder.throwOne({
            message: 'Schema not object',
            objectName: schemaName
        });
    }

    return resolveSchemaRefs(schema, openapiSpec.components.schemas);
}

export function getChildSchemaItems(parentSchema, subResource) {
    return parentSchema.properties?.[subResource]?.items;
}

export function getChildSchema(parentSchema, subResource) {
    return parentSchema.properties?.[subResource];
}

function resolveSchemaRefs(schema, schemas, seen = new Set()) {
    if (!schema || typeof schema !== "object") return schema;

    if (schema.$ref) {
        const schemaName = schema.$ref.match(/^#\/components\/schemas\/(.+)$/)?.[1];
        if (!schemaName || !schemas?.[schemaName]) return schema;
        if (seen.has(schemaName)) return schemas[schemaName];
        return resolveSchemaRefs(schemas[schemaName], schemas, new Set([...seen, schemaName]));
    }

    if (Array.isArray(schema)) {
        return schema.map(item => resolveSchemaRefs(item, schemas, seen));
    }

    const resolved = { ...schema };

    for (const key of ["oneOf", "anyOf", "allOf"]) {
        if (Array.isArray(resolved[key])) {
            resolved[key] = resolved[key].map(item => resolveSchemaRefs(item, schemas, seen));
        }
    }

    if (resolved.properties && typeof resolved.properties === "object") {
        resolved.properties = Object.fromEntries(
            Object.entries(resolved.properties).map(([key, value]) => [
                key,
                resolveSchemaRefs(value, schemas, seen)
            ])
        );
    }

    if (resolved.items) {
        resolved.items = resolveSchemaRefs(resolved.items, schemas, seen);
    }

    return resolved;
}
