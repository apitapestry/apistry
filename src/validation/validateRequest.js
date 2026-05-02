/**
 * @typedef {Object} ValidationFailure
 * @property {number} statusCode
 * @property {string} description
 * @property {string} [property]
 * @property {any} [rejectedValue]
 */

import { UnprocessableEntityError } from '../utils/errors.js';
import { VALIDATION_FUNCTIONS } from './index.js';

/**
 * Execute contract-declared validations.
 * Throws if any validation failures are detected.
 *
 * @param {Object} options
 * @param {Object} options.schema OpenAPI request body schema
 * @param {Object} options.body Request body
 * @param {'insert'|'update'} options.intent
 * @param {Object} [options.prior] Optional prior object (unused for now)
 */
export async function validateRequest({ schema, body, intent, prior, externalServices, request }) {
    if (!schema || schema.type !== 'object' || !body) return;

    const failures = await validateSchemas({ schema, data: body, intent, prior, externalServices, request });

    if (failures.length === 0) return;

    throw new UnprocessableEntityError(
        failures.map(f => ({
            message: f.description,
            property: f.property,
            rejectedValue:
                f.rejectedValue !== undefined
                    ? String(f.rejectedValue)
                    : undefined
        }))
    );
}

/**
 * Walk an object schema and evaluate x-validations.
 * Always evaluates all rules.
 */
async function validateSchemas({ schema, data, intent, prior, externalServices, request }) {
    const failures = [];

    await walkSchemaValidations({
        schema,
        data,
        path: undefined,
        intent,
        prior,
        externalServices,
        request,
        failures
    });

    return failures;
}

async function walkSchemaValidations({ schema, data, path, intent, prior, externalServices, request, failures }) {
    if (!schema || schema.type !== 'object' || !data) return;

    const propertyPath = path && path.length > 0 ? path : undefined;

    // 1) Object-level validations (schema-level) — ONLY httpCheck allowed here.
    const objectRules = schema['x-validations'];
    if (Array.isArray(objectRules)) {
        for (const rule of objectRules) {
            const normalized = normalizeValidationRule(rule);
            if (!normalized) {
                failures.push(...mapValidationErrorsToHttp([{
                    type: 'definition',
                    description: 'Invalid validation rule definition (expected {function,parameters} or {<name>: <params>})',
                    property: propertyPath
                }]));
                continue;
            }

            if (normalized.function !== 'httpCheck') {
                failures.push(...mapValidationErrorsToHttp([{
                    type: 'definition',
                    description: `Validation function '${normalized.function}' is only allowed at property level`,
                    property: propertyPath
                }]));
                continue;
            }

            const result = await runValidationRule({
                rule,
                value: data,
                property: propertyPath,
                schema,
                intent,
                prior,
                body: data,
                externalServices,
                request
            });

            if (Array.isArray(result) && result.length > 0) {
                failures.push(...result);
            }
        }
    }

    // 2) Property-level validations — httpCheck is NOT allowed here.
    const properties = schema.properties ?? {};
    for (const [propName, propSchema] of Object.entries(properties)) {
        const rules = propSchema['x-validations'];

        const value = data[propName];
        const childPath = propertyPath ? `${propertyPath}.${propName}` : propName;

        if (Array.isArray(rules)) {
            if (value !== undefined && value !== null) {
                for (const rule of rules) {
                    const normalized = normalizeValidationRule(rule);
                    if (!normalized) {
                        failures.push(...mapValidationErrorsToHttp([{
                            type: 'definition',
                            description: 'Invalid validation rule definition (expected {function,parameters} or {<name>: <params>})',
                            property: childPath
                        }]));
                        continue;
                    }

                    if (normalized.function === 'httpCheck') {
                        failures.push(...mapValidationErrorsToHttp([{
                            type: 'definition',
                            description: 'httpCheck is only allowed at object level',
                            property: childPath
                        }]));
                        continue;
                    }

                    const result = await runValidationRule({
                        rule,
                        value,
                        property: childPath,
                        schema: propSchema,
                        intent,
                        prior,
                        body: data,
                        externalServices,
                        request
                    });

                    if (Array.isArray(result) && result.length > 0) {
                        failures.push(...result);
                    }
                }
            }
        }

        // 3) Recurse into nested objects so object-level validations work there too.
        if (propSchema?.type === 'object' && value && typeof value === 'object') {
            await walkSchemaValidations({
                schema: propSchema,
                data: value,
                path: childPath,
                intent,
                prior,
                externalServices,
                request,
                failures
            });
        }
    }
}

function mapValidationErrorsToHttp(errors = []) {
    if (!Array.isArray(errors)) return [];

    return errors.map((e) => {
        const type = e?.type ?? 'data';
        // Hard invariant: ONLY outbound HTTP dependency failures may map to 500.
        const statusCode = type === 'external_http_dependency' ? 500 : 422;

        return {
            ...e,
            statusCode
        };
    });
}

function normalizeValidationRule(rule) {
    // Supported shapes:
    // 1) { function: 'equals', parameters: {...} }
    // 2) { equals: {...} }  (short form, used by httpCheck in contracts)
    if (!rule || typeof rule !== 'object') return null;

    if (typeof rule.function === 'string') {
        return {
            function: rule.function,
            parameters: rule.parameters ?? {}
        };
    }

    const keys = Object.keys(rule);
    if (keys.length !== 1) return null;

    const fnName = keys[0];
    return {
        function: fnName,
        parameters: rule[fnName] ?? {}
    };
}

/**
 * Dispatch a single validation rule.
 */
export async function runValidationRule({ rule, value, property, schema, intent, prior, body, externalServices, request }) {
    const normalized = normalizeValidationRule(rule);

    if (!normalized) {
        return mapValidationErrorsToHttp([{
            type: 'definition',
            description: 'Invalid validation rule definition (expected {function,parameters} or {<name>: <params>})',
            property
        }]);
    }

    const fn = VALIDATION_FUNCTIONS[normalized.function];

    if (!fn) {
        return mapValidationErrorsToHttp([{
            type: 'definition',
            description: `Unknown validation function '${normalized.function}'`,
            property
        }]);
    }

    // Uniform execution: validators may be sync or async; we always await.
    try {
        const args = {
            value,
            property,
            schema,
            params: normalized.parameters ?? {},
            body,
            intent,
            prior,

            [normalized.function]: normalized.parameters
        };

        // httpCheck needs service injection + a different parameter name.
        if (normalized.function === 'httpCheck') {
            const svcName = normalized.parameters?.source;
            if (!svcName || typeof svcName !== 'string') {
                return mapValidationErrorsToHttp([{
                    type: 'definition',
                    description: 'httpCheck requires parameters.source (service name)',
                    property
                }]);
            }

            const service = externalServices?.assertService
                ? externalServices.assertService(svcName)
                : undefined;

            delete args.httpCheck;
            args.httpCheck = normalized.parameters;
            args.request = request;
            args.service = service;
        }

        const resolved = await fn(args);
        return mapValidationErrorsToHttp(resolved ?? []);
    } catch (e) {
        const statusCode = e?.status === 500 ? 500 : 422;
        const type = statusCode === 500 ? 'external_http_dependency' : 'data';

        return [{
            statusCode,
            type,
            description: e?.message ?? 'Validation failed',
            property
        }];
    }
}
