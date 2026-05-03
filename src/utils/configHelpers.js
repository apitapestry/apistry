import path from 'path';
import { ConfigurationError } from './errors.js';

const DEFAULT_LISTEN_HOST = '0.0.0.0';

export function resolvePathFromCwd(targetPath) {
    return path.resolve(process.cwd(), targetPath);
}

export function getContractPath(config) {
    const contractPath = config?.path;
    if (!config) {
        throw new ConfigurationError(
            {},
            { message: 'Config file missing required "contracts" section' }
        );
    }
    if (!config.path) {
        throw new ConfigurationError(
            {},
            { message: 'Config "contracts" section missing required "path" field' }
        );
    }
    return resolvePathFromCwd(contractPath);
}

/**
 * Validate config structure and required fields
 * Keep this STRICT and boring
 */
export function validateConfig(config) {
    if (!config || typeof config !== 'object') {
        throw new ConfigurationError(
            {},
            { message: 'Configuration must be an object' }
        );
    }

    if (!config.server || typeof config.server !== 'object' || Array.isArray(config.server)) {
        throw new ConfigurationError(
            {},
            { message: 'Config file missing required "server" section' }
        );
    }

    if (!config.server.port) {
        throw new ConfigurationError(
            {},
            { message: 'Config "server" section missing required "port" field' }
        );
    }

    if (config.server.host !== undefined && typeof config.server.host !== 'string') {
        throw new ConfigurationError(
            { hostType: typeof config.server.host },
            { message: 'Config "server.host" must be a string' }
        );
    }

    if (config.server.publicBaseUrl !== undefined && typeof config.server.publicBaseUrl !== 'string') {
        throw new ConfigurationError(
            { publicBaseUrlType: typeof config.server.publicBaseUrl },
            { message: 'Config "server.publicBaseUrl" must be a string when provided' }
        );
    }

    if (!config.database || typeof config.database !== 'object' || Array.isArray(config.database)) {
        throw new ConfigurationError(
            {},
            { message: 'Config file missing required "database" section' }
        );
    }

    if (!config.database.connection || typeof config.database.connection !== 'string') {
        throw new ConfigurationError(
            {},
            { message: 'Config "database" section missing required "connection" field' }
        );
    }

    if (config.localSite !== undefined) {
        if (!config.localSite || typeof config.localSite !== 'object' || Array.isArray(config.localSite)) {
            throw new ConfigurationError(
                { localSiteType: typeof config.localSite },
                { message: 'Config "localSite" must be an object' }
            );
        }

        if (config.localSite.path !== undefined && typeof config.localSite.path !== 'string') {
            throw new ConfigurationError(
                { pathType: typeof config.localSite.path },
                { message: 'Config "localSite.path" must be a string' }
            );
        }
    }

    // Optional section: externalSources
    // Detailed validation/materialization is handled by ExternalServiceRegistry at startup.
    if (config.externalSources !== undefined) {
        if (!config.externalSources || typeof config.externalSources !== 'object' || Array.isArray(config.externalSources)) {
            throw new ConfigurationError(
                { externalSourcesType: typeof config.externalSources },
                { message: 'Config "externalSources" must be an object keyed by service name' }
            );
        }
    }

    if (config.security !== undefined) {
        if (!config.security || typeof config.security !== 'object' || Array.isArray(config.security)) {
            throw new ConfigurationError(
                { securityType: typeof config.security },
                { message: 'Config "security" must be an object' }
            );
        }

        if (config.security.bearerToken !== undefined && typeof config.security.bearerToken !== 'string') {
            throw new ConfigurationError(
                { bearerTokenType: typeof config.security.bearerToken },
                { message: 'Config "security.bearerToken" must be a string when provided' }
            );
        }

        if (config.security.apiKey !== undefined) {
            if (!config.security.apiKey || typeof config.security.apiKey !== 'object' || Array.isArray(config.security.apiKey)) {
                throw new ConfigurationError(
                    { apiKeyType: typeof config.security.apiKey },
                    { message: 'Config "security.apiKey" must be an object when provided' }
                );
            }

            if (typeof config.security.apiKey.key !== 'string' || config.security.apiKey.key.trim() === '') {
                throw new ConfigurationError(
                    {},
                    { message: 'Config "security.apiKey.key" must be a non-empty string' }
                );
            }

            if (typeof config.security.apiKey.value !== 'string' || config.security.apiKey.value.trim() === '') {
                throw new ConfigurationError(
                    {},
                    { message: 'Config "security.apiKey.value" must be a non-empty string' }
                );
            }
        }
    }
}

export function getLocalSitePath(config) {
    const sitePath = config?.path;

    if (!sitePath || sitePath.trim() === '') {
        return undefined;
    }

    return resolvePathFromCwd(sitePath);
}

export function resolveServerConfig(serverConfig = {}, env = process.env) {
    const host = getPreferredString(env.HOST, serverConfig.host) ?? DEFAULT_LISTEN_HOST;
    const port = getNormalizedPort(getPreferredValue(env.PORT, serverConfig.port));

    return { host, port };
}

function getPreferredValue(...values) {
    for (const value of values) {
        if (value !== undefined && value !== null) {
            return value;
        }
    }
    return undefined;
}

function getPreferredString(...values) {
    for (const value of values) {
        if (typeof value === 'string' && value.trim() !== '') {
            return value.trim();
        }
    }
    return undefined;
}

function getNormalizedPort(value) {
    const normalized = typeof value === 'number'
        ? value
        : Number.parseInt(String(value).trim(), 10);

    if (!Number.isInteger(normalized) || normalized < 1 || normalized > 65535) {
        throw new ConfigurationError(
            { port: value },
            { message: 'Config "server.port" must be an integer between 1 and 65535' }
        );
    }

    return normalized;
}

export function getDbConnection(connectionString) {
    if (connectionString === 'sqlite://IN-MEMORY-DB') {
        return connectionString;
    }

    if (connectionString.startsWith('postgres://') || connectionString.startsWith('postgresql://')) {
        return connectionString;
    }

    if (connectionString.startsWith('sqlite://')) {
        const connPath = connectionString.slice('sqlite://'.length);
        return `sqlite://${resolvePathFromCwd(connPath)}`;
    }

    return connectionString;
}

// Helper to mask sensitive connection string parts
export function getMaskDbConnection(connectionString) {
    return connectionString.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
}

export function getCorsConfig(corsConfig) {
    // No config provided -> use plugin defaults (enabled + origins: true)
    if (corsConfig === undefined || corsConfig === null) {
        return undefined;
    }

    // Allow shorthand: cors: false
    if (corsConfig === false) {
        return { enabled: false };
    }

    if (typeof corsConfig !== 'object' || Array.isArray(corsConfig)) {
        throw new ConfigurationError(
            { corsType: typeof corsConfig },
            { message: 'Config "cors" must be an object or false' }
        );
    }

    const enabled = corsConfig.enabled !== undefined ? Boolean(corsConfig.enabled) : true;

    // Support the Fastify CORS origin forms this config layer exposes.
    if (corsConfig.origins !== undefined) {
        const isValidOrigins = typeof corsConfig.origins === 'string'
            || corsConfig.origins === true
            || (Array.isArray(corsConfig.origins) && corsConfig.origins.every(o => typeof o === 'string'));

        if (!isValidOrigins) {
            throw new ConfigurationError(
                { origins: corsConfig.origins },
                { message: 'Config "cors.origins" must be true, a string, or an array of origin strings' }
            );
        }
        return { enabled, origins: corsConfig.origins };
    }

    // Default for start if cors object exists but no origins provided:
    // be permissive unless explicitly disabled.
    return { enabled, origins: true };
}

export function resolveEnvVarOrValue(val) {
    if (typeof val === 'string' && val.startsWith('$')) {
        const envVar = val.slice(1);
        const envValue = process.env[envVar];
        if (!envValue || envValue.trim() === '') {
            throw new ConfigurationError(
                { envVar },
                { message: `Environment variable '${envVar}' referenced in config but is not set or empty.` }
            );
        }
        return envValue.trim();
    }
    return typeof val === 'string' ? val.trim() : '';
}

export function getSecurityConfig(securityConfig) {
    if (!securityConfig || typeof securityConfig !== 'object' || Array.isArray(securityConfig)) {
        return undefined;
    }

    const bearerToken = resolveEnvVarOrValue(securityConfig.bearerToken);

    const apiKey = securityConfig.apiKey && typeof securityConfig.apiKey === 'object' && !Array.isArray(securityConfig.apiKey)
        ? {
            key: String(securityConfig.apiKey.key || '').trim(),
            value: resolveEnvVarOrValue(securityConfig.apiKey.value)
        }
        : null;

    const normalized = {};

    if (bearerToken) {
        normalized.bearerToken = bearerToken;
    }

    if (apiKey?.key && apiKey?.value) {
        normalized.apiKey = apiKey;
    }

    return Object.keys(normalized).length > 0 ? normalized : undefined;
}
