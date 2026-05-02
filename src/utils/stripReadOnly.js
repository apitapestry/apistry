import {getSchema} from "./subFilter.js";

export function stripReadOnly(req, exclusionProp = null) {
    const rawSchema = req.routeOptions?.schema?.body;
    const body = req.body;

    if (!body || isPrimitive(body) || !rawSchema) return body;

    const schemas = getSchema(rawSchema);
    if (!schemas.length) return body;

    return stripPhase(body, schemas[0], exclusionProp);
}

function isPrimitive(body) {
    let temp = Array.isArray(body) ? body[0] : body;
    return (
        temp == null ||
        typeof temp === "string" ||
        typeof temp === "number" ||
        typeof temp === "boolean"
    );
}

// ---- Phase 1: removal-only ----
function stripPhase(body, schema, exclusionProp) {
    if (!schema || !body) return body;

    if (Array.isArray(body)) {
        return body.map(item => stripPhase(item, schema, exclusionProp));
    }

    if (typeof body !== "object" || schema.type !== "object") {
        return body;
    }

    const result = { ...body };

    for (const key of Object.keys(body)) {
        const propSchema = schema.properties?.[key];
        if (!propSchema) continue;

        if (exclusionProp && key === exclusionProp) {
            continue;
        }

        if (propSchema.readOnly === true) {
            delete result[key];
            continue;
        }

        if (propSchema.type === "object" && typeof body[key] === "object") {
            result[key] = stripPhase(body[key], propSchema, exclusionProp);
            continue;
        }

        if (propSchema.type === "array" && Array.isArray(body[key])) {
            if (propSchema.items?.type === "object") {
                result[key] = body[key].map(v =>
                    stripPhase(v, propSchema.items, exclusionProp)
                );
            }
        }
    }

    return result;
}
