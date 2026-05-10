import glue from 'fastify-openapi-glue';

import {
    getHealth,
    getReady,
    getMetrics,
    notImplemented, getOrchestrationActions
} from '../handlers/utilityHandlers.js';

// Orchestration
import { hasOrchestration } from '../orchestration/extensions.js';
import { createOrchestrationHandler } from '../handlers/orchestrationHandler.js';

// DB handlers
import dbDelete from '../handlers/deleteHandler.js';
import dbGet from '../handlers/getHandler.js';
import dbInsert from '../handlers/insertHandler.js';
import dbSubDelete from '../handlers/deleteSubHandler.js';
import dbSubGet from '../handlers/getSubHandler.js';
import dbSubInsert from '../handlers/insertSubHandler.js';
import dbSubUpdate from '../handlers/updateSubHandler.js';
import dbUpdate from '../handlers/updateHandler.js';

const METHOD_HANDLERS = Object.freeze({
    GET: dbGet,
    DELETE: dbDelete,
    POST: dbInsert,
    PUT: notImplemented,
    PATCH: dbUpdate
});

const METHOD_SUB_HANDLERS = Object.freeze({
    GET: dbSubGet,
    DELETE: dbSubDelete,
    POST: dbSubInsert,
    PUT: notImplemented,
    PATCH: dbSubUpdate
});

export async function controllersPlugin(app, options) {
    const { openapiSpec } = options;

    if (!app.orchestrationActions) {
        throw new Error('controllersPlugin requires app.orchestrationActions to be decorated at startup');
    }

    // Registry is immutable after startup; safe to capture in closure.
    const orchestrationHandler = createOrchestrationHandler({
        registry: app.orchestrationActions
    });

    await app.register(glue, {
        specification: openapiSpec,
        serviceHandlers: createServiceHandlers({ orchestrationHandler }),
        noAdditional: false,
        responseValidation: true,
        querystring: true,
        params: true,
        headers: true
    });
}

/**
 * This Proxy returns ONE handler for ALL operationIds.
 * Glue wraps it, so request.openapi is always present.
 */
function createServiceHandlers({ orchestrationHandler }) {
    return new Proxy({}, {
        get(_, operationId) {
            return createDispatcher(operationId, { orchestrationHandler });
        },
        has() {
            return true;
        }
    });
}

/**
 * Universal dispatcher for all OpenAPI-defined routes.
 */
function createDispatcher(operationId, { orchestrationHandler }) {
    return async function (request, reply) {

        const operationId = request.routeOptions.schema.operationId;

        // -----------------------------------------------
        // Orchestration (opt-in via x-orchestration)
        // -----------------------------------------------
        if (hasOrchestration(request.routeOptions?.schema)) {
            return orchestrationHandler(request, reply);
        }

        if (operationId === 'getOrchestrationActions') {
            return getOrchestrationActions(request, reply);
        }
        if (operationId === 'getHealth') {
            return getHealth(request, reply);
        }
        if (operationId === 'getReady') {
            return getReady(request, reply);
        }
        if (operationId === 'getMetrics') {
            return getMetrics(request, reply);
        }

        const method = request.method.toUpperCase();
        if (isSubresource(request)) {
            return METHOD_SUB_HANDLERS[method](request, reply);
        }
        return METHOD_HANDLERS[method](request, reply);
    };
}

/**
 * Detect whether the contract path has a subresource.
 */
function isSubresource(request) {
    const path = request.routeOptions.config.url;
    if (!path) return false;

    if (!path.includes('/:')) return false;
    // Example match: /resource/:parentId/child
    return /:\w+\/[^^/]+/.test(path);
}
