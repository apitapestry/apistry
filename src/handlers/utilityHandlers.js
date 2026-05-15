// Get Health (GET /health)
export function getHealth(req, res) {
    res.code(200);
    return { status: "Healthy" };
}

// Get Ready (GET /ready)
export function getReady(req, res) {
    res.code(200);
    return { status: "Ready" };
// todo: need to add real readiness checks, e.g. db connection, contracts loaded, etc.
}

// Get Metrics (GET /metrics)
export function getMetrics(req, res) {
    res.type('text/plain');
    res.code(200);
    return `This is sample response only (implementation tbd)\nhttp_requests_total{method="GET",path="/cars"} 12487\nhttp_request_duration_ms_bucket{le="100"} 9821\nprocess_resident_memory_bytes 734003200`;
}

export async function getOrchestrationActions(req, reply) {
    // Fastify decorates on the server instance; most handlers access it via req.server.
    // Some wrappers may pass the Fastify instance as `req` directly, so we support both.
    const registry = req.server.orchestrationActions;
    if (!registry) {
        throw new Error('orchestration action registry not initialized');
    }

    const actions = registry.getAllActions();

    const result = actions.map(action => {
        const details = action.details;
        const params = details.params
            ? Object.entries(details.params).map(([name, def]) => ({
                name,
                ...def
            }))
            : [];

        return {
            name: details.name,
            description: details.description ?? '',
            params
        };
    });

    return reply.send(result);
}

export function notImplemented(req, res) {
    res.code(501);
    return {
        error: "not_implemented",
        message: "This feature is not implemented."
    };
}
