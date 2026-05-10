import { addValidation, ValidationSeverity } from '../validation.js';

/**
 * http.call
 *
 * Performs an outbound HTTP request (using global fetch).
 *
 * Refined orchestration model:
 * - `saveAs` is a *variable binding* in orchestration scope. When provided, the step result is stored under
 *   `ctx.state.vars[saveAs]` and can be consumed by later steps.
 * - This action should NOT affect the HTTP response body by default. The only action that should produce
 *   `ctx.state.response.body` is `contract.normalize.response`.
 * - `setResponseBody` is kept as a transitional, backwards-compatible escape hatch for older contracts.
 *
 * Params:
 * - url (string) required
 * - method (string) defaults to ctx.request.method
 * - headers (object) optional
 * - query (object) optional
 * - bodyFrom ("request.body" | "state.request.body" | string dot-path) optional
 * - saveAs (string) optional (if omitted, no variable will be bound)
 * - response ("json"|"text") defaults to "json" and falls back to text if JSON parse fails
 * - setResponseBody (boolean) OPTIONAL and transitional (legacy default: true)
 */
export function getDetails() {
    return {
        name: 'http.call',
        description: 'Invoke an outbound HTTP endpoint and store the upstream response in orchestration context',
        params: {
            url: {
                type: 'string',
                required: true,
                description: 'Target URL. Path parameters may be interpolated using {paramName}.'
            },
            method: {
                type: 'string',
                description: 'HTTP method to use. Defaults to incoming request method.'
            },
            headers: {
                type: 'object',
                description: 'Optional request headers to send upstream.'
            },
            query: {
                type: 'object',
                description: 'Optional query parameters to add to the URL.'
            },
            bodyFrom: {
                type: 'string',
                description: 'Optional dot-path to a value to send as the request body (e.g. "request.body").'
            },
            saveAs: {
                type: 'string',
                description: 'When provided, store the upstream result at ctx.state.vars[saveAs] as { status, headers, body }.'
            },
            response: {
                type: 'string',
                enum: ['json', 'text'],
                description: 'How to parse the upstream response body (defaults to "json"; falls back to text if JSON parsing fails).'
            },
            setResponseBody: {
                type: 'boolean',
                description: 'Legacy escape hatch: when true, set ctx.state.response.{statusCode,body,headers} from upstream.'
            }
        }
    };
}

export default async function execute(ctx, params) {
    const url = params?.url;
    if (!url || typeof url !== 'string') {
        addValidation(ctx, {
            severity: ValidationSeverity.fatal,
            message: 'http.call requires params.url',
            objectName: 'http.call',
            property: 'url'
        });
        return;
    }

    // `saveAs` is the recommended way to pass data between orchestration steps.
    // Variable names like "upstream", "characters", etc. are user-defined and should be descriptive.
    const saveAs = typeof params.saveAs === 'string' ? params.saveAs : undefined;

    let resolvedUrl;
    try {
        resolvedUrl = interpolatePath(url, ctx.request?.params);
    } catch (err) {
        addValidation(ctx, {
            severity: ValidationSeverity.fatal,
            message: err.message,
            objectName: 'http.call',
            property: 'url'
        });
        return;
    }

    const reqUrl = new URL(resolvedUrl);

    if (params?.query && typeof params.query === 'object') {
        for (const [k, v] of Object.entries(params.query)) {
            if (v === undefined || v === null) continue;
            reqUrl.searchParams.set(k, String(v));
        }
    }

    const method = (params.method ?? ctx.request.method ?? 'GET').toUpperCase();

    const headers = {
        accept: 'application/json',
        ...(params.headers ?? {})
    };

    let body;
    const bodyFrom = params.bodyFrom;
    if (bodyFrom) {
        body = resolvePath(ctx, bodyFrom);
    }

    const hasBody = body !== undefined && body !== null && method !== 'GET' && method !== 'HEAD';

    const fetchOpts = {
        method,
        headers
    };

    if (hasBody) {
        // Default to JSON.
        if (!Object.keys(headers).some(h => h.toLowerCase() === 'content-type')) {
            fetchOpts.headers = { ...headers, 'content-type': 'application/json' };
        }
        fetchOpts.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    const upstream = await ctx.io.fetch(reqUrl.toString(), fetchOpts);

    // Map upstream 404 to contract-level 404
    if (upstream.status === 404) {
        addValidation(ctx, {
            severity: ValidationSeverity.fatal,
            statusCode: 404,
            message: 'Upstream resource not found',
            objectName: 'http.call'
        });

        // Still store upstream response if saveAs is provided (useful for debugging)
        if (saveAs) {
            ctx.state.vars[saveAs] = {
                status: upstream.status,
                headers: upstream.headers?.entries
                    ? Object.fromEntries(upstream.headers.entries())
                    : {},
                body: null
            };
        }

        return;
    }

    const contentType = upstream.headers?.get?.('content-type') ?? '';
    const desired = params.response ?? 'json';

    let parsed;
    if (desired === 'text' || !String(contentType).includes('application/json')) {
        parsed = await upstream.text();
    } else {
        const txt = await upstream.text();
        try {
            parsed = txt ? JSON.parse(txt) : null;
        } catch {
            parsed = txt;
        }
    }

    // Always store the call result in vars when saveAs is provided.
    // Shape is stable for downstream steps: { status, headers, body }.
    if (saveAs) {
        ctx.state.vars[saveAs] = {
            status: upstream.status,
            headers: upstream.headers?.entries ? Object.fromEntries(upstream.headers.entries()) : {},
            body: parsed
        };
    }

    // Legacy behavior (kept for existing contracts): allow http.call to populate the HTTP response.
    // In the refined model, prefer `saveAs` + `contract.normalize.response` instead.
    if (params?.setResponseBody === true || (!('setResponseBody' in (params ?? {})) && !saveAs)) {
        ctx.state.response.statusCode = upstream.status;
        ctx.state.response.body = parsed;
        if (contentType) {
            ctx.state.response.headers['content-type'] = contentType;
        }
    }
}

function resolvePath(ctx, path) {
    if (path === 'request.body') return ctx.request.body;
    if (path === 'state.request.body') return ctx.state.request.body;

    if (typeof path !== 'string') return undefined;

    const parts = path.split('.');
    let cur = ctx;
    for (const p of parts) {
        if (cur == null) return undefined;
        cur = cur[p];
    }
    return cur;
}

function interpolatePath(url, params) {
    return url.replace(/\{([^}]+)\}/g, (_, name) => {
        const value = params?.[name];
        if (value === undefined || value === null) {
            throw new Error(`Missing required path parameter '${name}'`);
        }
        return encodeURIComponent(String(value));
    });
}
