import fp from 'fastify-plugin';

export async function securityPlugin(app, options) {
    const { openapiSpec, runtimeSecurity } = options;
    if (!isSecurityConfigured(runtimeSecurity)) {
        return;
    }

    const schemeEvaluators = buildSchemeEvaluators(openapiSpec, runtimeSecurity);
    const routeSecurityIndex = buildRouteSecurityIndex(openapiSpec);

    app.addHook('preHandler', securityPreHandler.bind(null, schemeEvaluators, routeSecurityIndex));
}

function isSecurityConfigured(runtimeSecurity) {
    return Boolean(runtimeSecurity?.bearerToken || runtimeSecurity?.apiKey?.value);
}

async function securityPreHandler(schemeEvaluators, routeSecurityIndex, request, reply) {
    const routePath = request.routeOptions?.config?.url || request.routeOptions?.url;
    const routeMethod = String(request.method || '').toLowerCase();

    const routeSecurity = request.routeOptions?.schema?.security
        ?? request.openapi?.schema?.security
        ?? routeSecurityIndex.get(`${routeMethod} ${routePath}`);

    // Only enforce when the endpoint explicitly defines security.
    if (!Array.isArray(routeSecurity) || routeSecurity.length === 0) {
        return;
    }

    const authorized = routeSecurity.some(securityRequirement => isSecurityRequirementSatisfied(securityRequirement, schemeEvaluators, request));

    if (!authorized) {
        return reply.code(401).send({
            statusCode: 401,
            error: 'Unauthorized',
            message: 'Unauthorized'
        });
    }
}

function isSecurityRequirementSatisfied(securityRequirement, schemeEvaluators, request) {
    if (!securityRequirement || typeof securityRequirement !== 'object') return false;
    const requiredSchemes = Object.keys(securityRequirement);
    // If the requirement is empty, it means 'no authentication required' for this set
    if (requiredSchemes.length === 0) return true;
    // All schemes in this requirement must be satisfied
    return requiredSchemes.every(schemeName => {
        const evaluator = schemeEvaluators.get(schemeName);
        return typeof evaluator === 'function' && evaluator(request);
    });
}

function buildSchemeEvaluators(openapiSpec, runtimeSecurity) {
    const evaluators = new Map();
    const securitySchemes = openapiSpec?.components?.securitySchemes || {};

    for (const [schemeName, schemeDef] of Object.entries(securitySchemes)) {
        if (isBearerScheme(schemeDef) && runtimeSecurity?.bearerToken) {
            evaluators.set(schemeName, request => hasBearerToken(request, runtimeSecurity.bearerToken));
        } else if (schemeDef?.type === 'apiKey' && runtimeSecurity?.apiKey?.value) {
            const location = schemeDef.in || 'header';
            const keyName = (runtimeSecurity.apiKey.key || schemeDef.name || '').trim();
            if (keyName) {
                evaluators.set(schemeName, request => hasApiKey(request, { location, keyName, expectedValue: runtimeSecurity.apiKey.value }));
            }
        }
    }

    return evaluators;
}

function isBearerScheme(schemeDef) {
    return schemeDef?.type === 'http' && String(schemeDef?.scheme || '').toLowerCase() === 'bearer';
}

function hasBearerToken(request, expectedToken) {
    const authorization = request.headers?.authorization;
    if (typeof authorization !== 'string') return false;
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    return match ? match[1].trim() === expectedToken : false;
}

function hasApiKey(request, { location, keyName, expectedValue }) {
    if (!expectedValue) return false;
    if (location === 'query') {
        const queryValue = request.query?.[keyName];
        return normalizeSingleValue(queryValue) === expectedValue;
    }
    if (location === 'header') {
        const headerValue = request.headers?.[keyName.toLowerCase()];
        return normalizeSingleValue(headerValue) === expectedValue;
    }
    return false;
}

function normalizeSingleValue(value) {
    if (Array.isArray(value)) return value.length > 0 ? String(value[0]) : undefined;
    if (value === undefined || value === null) return undefined;
    return String(value);
}

function normalizeOpenApiPath(pathname) {
    return String(pathname || '').replace(/{([^}]+)}/g, ':$1');
}

function buildRouteSecurityIndex(openapiSpec) {
    const index = new Map();
    const paths = openapiSpec?.paths || {};

    for (const [openapiPath, pathItem] of Object.entries(paths)) {
        if (!pathItem || typeof pathItem !== 'object') continue;
        const routePath = normalizeOpenApiPath(openapiPath);
        for (const [method, operation] of Object.entries(pathItem)) {
            if (!operation || typeof operation !== 'object') continue;
            const lowerMethod = method.toLowerCase();
            if (!['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace'].includes(lowerMethod)) continue;
            if (!Array.isArray(operation.security)) continue;
            index.set(`${lowerMethod} ${routePath}`, operation.security);
        }
    }
    return index;
}

export default fp(securityPlugin, { name: 'security-plugin' });
