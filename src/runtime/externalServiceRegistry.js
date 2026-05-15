import { ConfigurationError } from '../utils/errors.js';

/**
 * @typedef {Object} ResolvedExternalService
 * @property {string} name
 * @property {string} baseUrl
 * @property {number} timeoutMs
 * @property {number} retries
 * @property {ResolvedAuth|null} auth
 */

/**
 * @typedef {Object} ResolvedAuth
 * @property {'bearer'|'apiKey'} type
 * @property {string} [token]
 * @property {string} [header]
 * @property {string} [value]
 */

/**
 * Startup-time immutable registry of external service descriptors.
 *
 * Responsibilities:
 * - Load services from config.externalSources
 * - Validate entries and materialize env-backed auth details
 * - Provide deterministic lookup at runtime
 */
export class ExternalServiceRegistry {
    /** @type {Map<string, ResolvedExternalService>} */
    #services;

    constructor(services) {
        this.#services = new Map(services);
        Object.freeze(this);
    }

    /**
     * Build a registry from the parsed server config.
     * Fails fast if any service definitions are invalid.
     */
    static fromConfig(rawConfig = {}) {
        const externalSources = rawConfig?.externalSources;
        if (externalSources === undefined || externalSources === null) {
            return new ExternalServiceRegistry([]);
        }

        if (typeof externalSources !== 'object' || Array.isArray(externalSources)) {
            throw new ConfigurationError(
                { externalSourcesType: typeof externalSources },
                { message: 'Config "externalSources" must be an object keyed by service name' }
            );
        }

        const entries = [];

        for (const [name, def] of Object.entries(externalSources)) {
            try {
                entries.push([name, resolveServiceDefinition(name, def)]);
            } catch (err) {
                if (err?.name === 'ConfigurationError') throw err;
                throw new ConfigurationError(
                    { service: name },
                    { message: `Invalid external source '${name}': ${err?.message ?? 'unknown error'}`, cause: err }
                );
            }
        }

        return new ExternalServiceRegistry(entries);
    }

    /**
     * Return resolved descriptor or undefined.
     * @param {string} name
     */
    getService(name) {
        return this.#services.get(name);
    }

    /**
     * Return descriptor or throw a ConfigurationError.
     * @param {string} name
     */
    assertService(name) {
        const svc = this.getService(name);
        if (!svc) {
            throw new ConfigurationError(
                { service: name, available: Array.from(this.#services.keys()) },
                { message: `Unknown external source: ${name}` }
            );
        }
        return svc;
    }

    /**
     * @returns {string[]}
     */
    listNames() {
        return Array.from(this.#services.keys());
    }
}

function resolveServiceDefinition(name, def) {
    if (!def || typeof def !== 'object' || Array.isArray(def)) {
        throw new Error('Service definition must be an object');
    }

    const baseUrl = def.baseUrl;
    if (!baseUrl || typeof baseUrl !== 'string') {
        throw new Error('baseUrl is required');
    }

    // Basic URL sanity (allow http/https only)
    let parsed;
    try {
        parsed = new URL(baseUrl);
    } catch {
        throw new Error('baseUrl must be a valid URL');
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('baseUrl must use http or https');
    }

    // Note: we intentionally do NOT normalize or strip trailing slashes.
    // This allows baseUrl prefixes like "https://example.com/api/v1/".

    const timeoutMs = def.timeoutMs ?? 5000;
    if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
        throw new Error('timeoutMs must be a positive integer');
    }

    const retries = def.retries ?? 0;
    if (!Number.isInteger(retries) || retries < 0) {
        throw new Error('retries must be a non-negative integer');
    }

    const auth = resolveAuth(def.auth);

    return Object.freeze({
        name,
        baseUrl: String(baseUrl),
        timeoutMs,
        retries,
        auth
    });
}

function resolveAuth(auth) {
    if (auth === undefined || auth === null) return null;

    if (typeof auth !== 'object' || Array.isArray(auth)) {
        throw new Error('auth must be an object');
    }

    const type = auth.type;
    if (type !== 'bearer' && type !== 'apiKey') {
        throw new Error('auth.type must be "bearer" or "apiKey"');
    }

    if (type === 'bearer') {
        const token = auth.token ?? (auth.tokenEnv ? process.env[auth.tokenEnv] : undefined);
        if (!token || typeof token !== 'string') {
            throw new Error('bearer auth requires token or tokenEnv');
        }

        return Object.freeze({ type: 'bearer', token });
    }

    // apiKey
    const header = auth.header;
    if (!header || typeof header !== 'string') {
        throw new Error('apiKey auth requires auth.header');
    }

    const value = auth.value ?? (auth.valueEnv ? process.env[auth.valueEnv] : undefined);
    if (!value || typeof value !== 'string') {
        throw new Error('apiKey auth requires value or valueEnv');
    }

    return Object.freeze({ type: 'apiKey', header, value });
}
