import { UnprocessableEntityError } from '../utils/errors.js';
import formatResponse from '../utils/formatResponse.js';
import {
    getCollectionSource,
    getIncludeResult,
    getResponseCode
} from '../utils/helpers.js';

/**
 * Standard response finalization.
 * Orchestrator owns status selection and formatting.
 */
export async function finalizeResponse(ctx) {
    const reply = ctx._reply;
    // Use the original Fastify request saved on ctx (needed for routeOptions/schema driven formatting).
    const request = ctx._request ?? ctx._fastifyRequest;

    // Convert accumulated non-fatal validation errors into 422
    const nonFatal = ctx.validation.errors.filter(e => e.severity === 'error' || e.severity === 'warning');
    const fatals = ctx.validation.errors.filter(e => e.severity === 'fatal');

    if (fatals.length > 0) {
        // Treat fatals as server errors unless caller catches and formats.
        const err = new Error(fatals[0]?.message ?? 'fatal_orchestration_error');
        err.event = fatals[0]?.code ?? 'fatal_orchestration_error';
        err.params = { validation: fatals };
        throw err;
    }

    if (nonFatal.some(e => e.severity === 'error')) {
        // Reuse existing 422 contract in errorsPlugin.
        const items = nonFatal
            .filter(e => e.severity === 'error')
            .map(e => ({
                message: e.message,
                objectName: e.objectName,
                property: e.property,
                rejectedValue: e.rejectedValue !== undefined && e.rejectedValue !== null
                    ? String(e.rejectedValue)
                    : undefined
            }));

        throw new UnprocessableEntityError(items);
    }

    // Prefer OpenAPI-driven status code selection (same as db handlers).
    // Allow orchestration to override via ctx.state/semantic if explicitly set.
    const openApiCode = getResponseCode(request);
    const statusCode = ctx.state.response.statusCode ?? ctx.semantic.response.code ?? openApiCode;

    // Prefer orchestration headers, but let formatResponse set Content-Range.
    for (const [k, v] of Object.entries(ctx.state.response.headers ?? {})) {
        if (v !== undefined) reply.header(k, v);
    }

    // Mirror formatResponse include-result rules.
    if (statusCode === 204 || !getIncludeResult(request)) {
        reply.code(statusCode);
        return reply.send();
    }

    // Keep orchestration-selected statusCode if provided; otherwise formatter will set it.
    if (ctx.state.response.statusCode ?? ctx.semantic.response.code) {
        reply.code(statusCode);
    }

    let body = ctx.state.response.body;
    let results = body === undefined ? [] : body;

    // Contract-driven collection unwrapping
    const collectionSource = getCollectionSource(request);

    if (
        collectionSource &&
        body &&
        typeof body === 'object' &&
        !Array.isArray(body)
    ) {
        const extracted = body[collectionSource];
        if (!Array.isArray(extracted)) {
            throw new UnprocessableEntityError([{
                message: `Expected response collection at '${collectionSource}', but value is not an array`
            }]);
        }
        results = extracted;
    }

    const totalCount = ctx.state.response.totalCount ?? null;

    const payload = formatResponse(results, request, reply, totalCount);
    if (payload === undefined) return reply.send();
    return reply.send(payload);
}
