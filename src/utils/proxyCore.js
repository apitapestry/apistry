export default async function getProxy(req, reply) {
    const proxyCfg = req.routeOptions.schema?.['x-proxy'];

    if (!proxyCfg?.targetUrl) {
        return;
    }

    // 1. Build target URL
    const url = new URL(proxyCfg.targetPath);

    // Path params
    for (const [key, value] of Object.entries(req.params ?? {})) {
        url.pathname = url.pathname.replace(`{${key}}`, value);
    }

    // Query params
    for (const [key, value] of Object.entries(req.query ?? {})) {
        url.searchParams.append(key, value);
    }

    // 2. Call upstream
    const upstream = await fetch(url.toString(), {
        method: req.method,
        headers: {
            'accept': 'application/json'
        }
    });

    // 3. Read body
    const bodyText = await upstream.text();

    // 4. Propagate status + content-type
    reply
        .code(upstream.status)
        .header('content-type', upstream.headers.get('content-type') ?? 'application/json');

    // 5. Return raw payload (no transform yet)
    return bodyText;
}
