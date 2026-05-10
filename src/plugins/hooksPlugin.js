import fp from 'fastify-plugin';
import { UnprocessableEntityErrorBuilder } from '../utils/errors.js';

export const hooksPlugin = fp(async function hooksPlugin(app, options) {
    const { openapiSpec } = options;
    const detailedLogs = process.env.LOG_LEVEL?.toLowerCase() === 'debug';
    const routeQueryParamIndex = buildRouteQueryParamIndex(openapiSpec);

    // Hook to add request-specific logger
    app.addHook("onRequest", async (req) => {
        req.log = req.log.child({
            url: req.url,
            method: req.method
        });
    });

    // Hook when Fastify instance is closing
    app.addHook('onClose', async (_instance) => {
        app.log.debug('Fastify instance closing');
    });

    // Hook when server is ready
    app.addHook('onReady', async () => {
        try {
            const routeLines = app.printRoutes().split('\n');
            const routeCount = routeLines.length > 1 ? routeLines.length - 1 : 0;
            app.log.info(`✅  Loaded ${routeCount} routes!`);

            if (detailedLogs) {
                app.log.debug('Fastify app ready', {
                    routeCount,
                    memoryUsage: process.memoryUsage(),
                    nodeVersion: process.version
                });
            }
        } catch (err) {
            app.log.warn('Error during route counting (non-critical):', err.message);
        }
    });

    // Validate unknown query parameters directly from the merged OpenAPI contract during preValidation
    app.addHook('preValidation', async (request) => {
        const queryEntries = Object.entries(request.query ?? {});
        if (queryEntries.length === 0) {
            return;
        }

        const routePath = request.routeOptions?.config?.url || request.routeOptions?.url;
        const routeMethod = String(request.method || '').toLowerCase();
        const allowedQueryParams = routeQueryParamIndex.get(`${routeMethod} ${routePath}`);

        if (!allowedQueryParams) {
            return;
        }

        const validation = new UnprocessableEntityErrorBuilder();

        for (const [paramName, paramValue] of queryEntries) {
            if (allowedQueryParams.has(paramName)) {
                continue;
            }

            validation.add({
                objectName: 'querystring',
                property: paramName,
                rejectedValue: Array.isArray(paramValue) ? paramValue.join(',') : paramValue,
                message: `Query parameter '${paramName}' is not valid`
            });
        }

        validation.throwIfAny();
    });
}, {
    name: 'hooks-plugin',
    encapsulate: false
});

function buildRouteQueryParamIndex(openapiSpec) {
    const index = new Map();
    const paths = openapiSpec?.paths || {};

    for (const [openapiPath, pathItem] of Object.entries(paths)) {
        if (!pathItem || typeof pathItem !== 'object') continue;

        const routePath = normalizeOpenApiPath(openapiPath);
        const pathParameters = Array.isArray(pathItem.parameters) ? pathItem.parameters : [];

        for (const [method, operation] of Object.entries(pathItem)) {
            const lowerMethod = String(method || '').toLowerCase();
            if (!['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace'].includes(lowerMethod)) continue;
            if (!operation || typeof operation !== 'object') continue;

            const operationParameters = Array.isArray(operation.parameters) ? operation.parameters : [];
            const allowedQueryParams = collectQueryParamNames([...pathParameters, ...operationParameters], openapiSpec);
            index.set(`${lowerMethod} ${routePath}`, allowedQueryParams);
        }
    }

    return index;
}

function collectQueryParamNames(parameters, openapiSpec) {
    const names = new Set();

    for (const parameterRefOrDef of parameters) {
        const parameter = resolveParameter(parameterRefOrDef, openapiSpec);
        if (!parameter || parameter.in !== 'query' || !parameter.name) {
            continue;
        }

        names.add(parameter.name);
    }

    return names;
}

function resolveParameter(parameterRefOrDef, openapiSpec) {
    if (!parameterRefOrDef || typeof parameterRefOrDef !== 'object') {
        return undefined;
    }

    if (!parameterRefOrDef.$ref) {
        return parameterRefOrDef;
    }

    const match = parameterRefOrDef.$ref.match(/^#\/components\/parameters\/([^/]+)$/);
    if (!match) {
        return undefined;
    }

    return openapiSpec?.components?.parameters?.[match[1]];
}

function normalizeOpenApiPath(pathname) {
    return String(pathname || '').replace(/{([^}]+)}/g, ':$1');
}
