import pino from 'pino';

export const ajvOptions = {
    allErrors: true,
    coerceTypes: true,
    discriminator: true,
    removeAdditional: true,
    useDefaults: true,
    strict: false,
    strictSchema: false
};

export function getFastifyConfig(logLevel) {
    const isInfoOrMoreVerbose = (logLevel === 'info' || logLevel === 'debug' || logLevel === 'trace');

    return {
        logger: getLoggerConfig({ logLevel, logMode: 'server' }),
        trustProxy: true,
        // Fastify's built-in request logging ("incoming request" / "request completed")
        // We want it in info+ and debug/trace.
        disableRequestLogging: !isInfoOrMoreVerbose,
        requestTimeout: 25000,
        connectionTimeout: 20000,
        keepAliveTimeout: 1000,
        routerOptions: {
            ignoreTrailingSlash: true
        },
        ajv: {
            customOptions: { ...ajvOptions }
        },
        bodyLimit: parseInt(process.env.BODY_LIMIT || '', 10) || 10 * 1024 * 1024
    };
}

function getLoggerConfig({ logLevel, logMode }) {
    const isDebug = logLevel === 'debug';
    const isServer = logMode === 'server';

    const base = {
        level: logLevel || 'info',
        redact: {
            paths: [
                'req.headers.authorization',
                'req.headers.cookie',
                'headers.authorization',
                'headers.cookie',
                'body.password',
                'body.token',
                'params.dbConnection',
            ],
            remove: true,
        },
        serializers: {
            err(err) {
                return {
                    type: err.constructor.name,
                    message: err.message,
                    code: err.code,
                    statusCode: err.statusCode,
                    ...(isDebug && err.stack && { stack: err.stack })
                };
            },
            // Controls the `req` object shown in Fastify's built-in "incoming request" logs.
            // Keep it metadata-only (no payload/body dump).
            req(req) {
                const url = req?.url;
                const path = typeof url === 'string' ? url.split('?')[0] : undefined;
                const contract = typeof path === 'string' ? path.match(/^\/v(\d+)\b/)?.[1] : undefined;
                const contentLengthHeader = req?.headers?.['content-length'];
                const contentLength = contentLengthHeader !== undefined ? Number(contentLengthHeader) : undefined;

                return {
                    method: req?.method,
                    url,
                    // path,
                    // query: req?.query,
                    host: req?.headers?.host,
                    // remoteAddress: req?.ip ?? req?.socket?.remoteAddress,
                    // remotePort: req?.socket?.remotePort,
                    contentLength,
                    contract,
                    hasBody: req?.body !== undefined && req?.body !== null
                };
            }
        }
    };

    // 🚨 Server mode: structured, enterprise JSON
    if (isServer) {
        return {
            ...base,
            base: {
                service: process.env.SERVICE_NAME || 'apistry',
                env: process.env.NODE_ENV || 'dev'
            },
            timestamp: () => `,"ts":"${new Date().toISOString()}"`,
            formatters: {
                level(label) {
                    return { level: label.toUpperCase() };
                }
            }
        };
    }

    // 🧑‍💻 CLI mode: human-readable
    return {
        ...base,
        transport: {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'HH:MM:ss',
                messageFormat: '{msg}',
                ignore: isDebug
                    ? 'hostname'
                    : 'pid,hostname',
                // Show structured objects at info as well (otherwise "incoming request" loses req/res details).
                hideObject: false
            }
        }
    };
}

export function getLogger(logLevel = 'info') {
    return pino(getLoggerConfig({ logLevel, logMode: 'server' }));
}

/**
 * CLI logger (always CLI mode)
 */
export function getCliLogger(logLevel = 'info') {
    return getLogger(logLevel, 'cli');
}
