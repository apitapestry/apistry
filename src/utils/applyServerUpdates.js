import { v4 as uuidv4 } from "uuid";

/**
 * Apply schema-driven server updates.
 *
 * @param {Object} opts
 * @param {Object} opts.schema        OpenAPI schema (already resolved to object schema)
 * @param {"insert"|"update"} opts.intent
 * @param {"parent"|"child"} opts.scope
 * @param {Object|Array} [opts.data]  Optional data to mutate (parent or child items)
 * @param {string} [opts.exclusionProp] Property to ignore (e.g. subResourceId)
 *
 * @returns {{
 *   updates?: Object,
 *   mutatedData?: Object|Array
 * }}
 */
export function applyServerUpdates({
                                       schema,
                                       intent,
                                       scope,
                                       data,
                                       exclusionProp = null
                                   }) {
    if (!schema || schema.type !== "object") {
        return {};
    }

    const updates = computeSchemaUpdates(schema, intent, exclusionProp);

    // Parent-only mode: no data provided, return only deltas
    if (!data) {
        return Object.keys(updates).length
            ? { updates }
            : {};
    }

    // Child or parent mutation mode
    const mutatedData = mutateDataWithUpdates(
        data,
        updates,
        schema,
        intent,
        exclusionProp
    );

    return {
        updates: Object.keys(updates).length ? updates : undefined,
        mutatedData
    };
}

function computeSchemaUpdates(schema, intent, exclusionProp) {
    const updates = {};

    for (const [key, propSchema] of Object.entries(schema.properties || {})) {
        // Arrays are subresource boundaries
        if (propSchema.type === "array" || propSchema.items) continue;

        // Exclusion only applies on UPDATE
        if (intent === "update" && exclusionProp && key === exclusionProp) {
            continue;
        }

        if (propSchema.readOnly !== true) continue;

        const directive =
            intent === "insert"
                ? propSchema["x-insert"]
                : propSchema["x-update"];

        if (!directive) continue;

        updates[key] = resolveDirective(directive, propSchema);
    }

    return updates;
}

function mutateDataWithUpdates(data, updates, schema, intent, exclusionProp) {
    if (Array.isArray(data)) {
        return data.map(item =>
            applyUpdatesToObject(
                item,
                updates,
                schema,
                intent,
                exclusionProp
            )
        );
    }

    return applyUpdatesToObject(
        data,
        updates,
        schema,
        intent,
        exclusionProp
    );
}

function applyUpdatesToObject(obj, updates, schema, intent, exclusionProp) {
    if (!obj || typeof obj !== "object") return obj;

    const result = { ...obj };

    // Apply server-owned fields for THIS schema
    for (const [key, value] of Object.entries(updates)) {
        result[key] = typeof value === "function"
            ? value(result)
            : value;
    }

    // Recurse into schema-defined children
    for (const [key, propSchema] of Object.entries(schema.properties || {})) {
        // Exclusion only applies on UPDATE
        if (intent === "update" && exclusionProp && key === exclusionProp) {
            continue;
        }

        // Nested object
        if (
            propSchema.type === "object" &&
            typeof result[key] === "object" &&
            !Array.isArray(result[key])
        ) {
            const childUpdates = computeSchemaUpdates(
                propSchema,
                intent,
                exclusionProp
            );

            result[key] = applyUpdatesToObject(
                result[key],
                childUpdates,
                propSchema,
                intent,
                exclusionProp
            );
        }

        // Array of objects
        if (
            propSchema.type === "array" &&
            propSchema.items?.type === "object" &&
            Array.isArray(result[key])
        ) {
            const itemSchema = propSchema.items;
            const itemUpdates = computeSchemaUpdates(
                itemSchema,
                intent,
                exclusionProp
            );

            result[key] = result[key].map(item =>
                applyUpdatesToObject(
                    item,
                    itemUpdates,
                    itemSchema,
                    intent,
                    exclusionProp
                )
            );
        }
    }

    return result;
}

function resolveDirective(directive, schema) {
    if (directive === "now") {
        return () => {
            const now = new Date();
            return schema.format === "date"
                ? now.toISOString().substring(0, 10)
                : now.toISOString();
        };
    }

    if (directive === "uuid") {
        return () => uuidv4();
    }

    if (typeof directive === "function") {
        return directive;
    }

    // literal value
    return () => directive;
}
