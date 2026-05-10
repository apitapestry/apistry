import { getCollection, getResponseCode, getResponseSchema } from '../utils/helpers.js';
import { createValidationBag } from './validation.js';
import { stripReadOnly } from '../utils/stripReadOnly.js';
import { applyServerUpdates } from '../utils/applyServerUpdates.js';

/**
 * Build the orchestration context.
 *
 * IMPORTANT: mechanical enforcement logic stays here and always runs.
 * - stripping read-only fields
 * - computing read-only fields (x-insert/x-update)
 * - applying defaults (Fastify/AJV already applies defaults)
 */
export function createOrchestrationContext({ request, reply }) {
    const routeSchema = request.routeOptions?.schema;

    const collectionName = safeGetCollection(request);

    const responseCode = safeGetResponseCode(request);
    const responseSchema = safeGetResponseSchema(request);

    // Minimal operation semantics. We keep it read-only.
    const semantic = Object.freeze({
        operationId: routeSchema?.operationId,
        method: request.method,
        url: request.url,
        pathTemplate: request.routeOptions?.config?.url ?? request.routeOptions?.url,
        collectionName,
        response: {
            code: responseCode,
            schema: responseSchema
        },
        request: {
            bodySchema: routeSchema?.body,
            paramsSchema: routeSchema?.params,
            querySchema: routeSchema?.querystring,
            headersSchema: routeSchema?.headers
        }
    });

    // Request view for actions (no Fastify objects).
    const reqView = {
        id: request.id,
        method: request.method,
        url: request.url,
        headers: { ...(request.headers ?? {}) },
        params: { ...(request.params ?? {}) },
        query: { ...(request.query ?? {}) },
        body: request.body
    };

    // Mechanical request prep (contract-driven, always-on)
    const prepared = prepareRequestPayload({ request });

    return {
        request: reqView,
        semantic,
        contract: {
            routeSchema
        },
        validation: createValidationBag(),
        // Mutable orchestration state.
        state: {
            request: {
                body: prepared.body,
                serverUpdates: prepared.serverUpdates
            },
            vars: {},
            response: {
                statusCode: undefined,
                headers: {},
                body: undefined
            }
        },
        // IO helpers (still not Fastify)
        io: {
            log: request.log,
            fetch: globalThis.fetch
        },
        // Keep original Fastify request/reply only for finalization step in orchestrator.
        _fastifyRequest: request,
        _reply: reply
    };
}

function safeGetCollection(req) {
    try {
        return getCollection(req);
    } catch {
        return undefined;
    }
}

function safeGetResponseCode(req) {
    try {
        return getResponseCode(req);
    } catch {
        return undefined;
    }
}

function safeGetResponseSchema(req) {
    try {
        return getResponseSchema(req);
    } catch {
        return undefined;
    }
}

function prepareRequestPayload({ request }) {
    const method = (request.method ?? '').toUpperCase();

    // Apply only when request has a body.
    if (!request.body) {
        return { body: request.body, serverUpdates: undefined };
    }

    // For insert/update handlers today, we strip readOnly and compute x-insert/x-update.
    if (method !== 'POST' && method !== 'PATCH' && method !== 'PUT') {
        return { body: request.body, serverUpdates: undefined };
    }

    // stripReadOnly uses routeSchema.body - so it’s properly contract-driven.
    const sanitizedBody = stripReadOnly(request, method === 'PATCH' ? undefined : null);

    // For server updates we need the canonical schema. Existing handlers call getParentSchema,
    // but it requires subFilter logic. We keep this lightweight:
    // - only compute server updates if routeSchema.body is directly an object schema.
    // - otherwise skip (existing handlers can still do it later when migrated).
    const bodySchema = request.routeOptions?.schema?.body;
    const schema = findFirstObjectSchema(bodySchema);

    if (!schema || schema.type !== 'object') {
        return { body: sanitizedBody, serverUpdates: undefined };
    }

    const intent = method === 'POST' ? 'insert' : 'update';
    const { updates, mutatedData } = applyServerUpdates({
        schema,
        intent,
        scope: 'parent',
        data: sanitizedBody
    });

    return { body: mutatedData ?? sanitizedBody, serverUpdates: updates };
}

function findFirstObjectSchema(rawSchema) {
    if (!rawSchema) return null;

    // fastify-openapi-glue sometimes wraps schema in oneOf/anyOf.
    const candidates = [];
    if (rawSchema.type) candidates.push(rawSchema);
    if (Array.isArray(rawSchema.oneOf)) candidates.push(...rawSchema.oneOf);
    if (Array.isArray(rawSchema.anyOf)) candidates.push(...rawSchema.anyOf);
    if (Array.isArray(rawSchema.allOf)) candidates.push(...rawSchema.allOf);

    return candidates.find(s => s && typeof s === 'object' && s.type === 'object') ?? null;
}
