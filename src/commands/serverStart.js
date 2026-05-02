import path from 'path';
import { ajvPlugin } from '../plugins/ajvPlugin.js';
import { controllersPlugin } from '../plugins/controllersPlugin.js';
import { errorsPlugin } from '../plugins/errorsPlugin.js';
import { getContracts } from './utils/getContracts.js';
import { mergeContracts } from './utils/mergeContracts.js';
import { getFastifyConfig } from '../plugins/configPlugin.js';
import { hooksPlugin } from '../plugins/hooksPlugin.js';
import { initDb } from "../db/index.js";
import { swaggerPlugin } from '../plugins/swaggerPlugin.js';
import { getLogger } from '../plugins/configPlugin.js';
import { loadOrchestrationActions } from "../plugins/orchestrationPlugin.js";
import { ActionRegistry } from "../orchestration/actionRegistry.js";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { ExternalServiceRegistry } from '../runtime/externalServiceRegistry.js';
import { staticPlugin } from '../plugins/staticPlugin.js';
import { securityPlugin } from '../plugins/securityPlugin.js';
import corsPlugin from '../plugins/corsPlugin.js';
import { ConfigurationError } from '../utils/errors.js';
import { loadDefaultConfig, loadConfigFile, mergeConfigs } from '../utils/configLoader.js';
import {
    getContractPath,
    getCorsConfig,
    getDbConnection,
    getLocalSitePath,
    getSecurityConfig,
    resolveServerConfig,
    validateConfig
} from '../utils/configHelpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Start the Apistry server with the given runtime configuration
 * This is the core server startup implementation, used by both CLI and tests
 */
export async function serverStart(config) {
    const runtimeConfig = {
        ...config
    };
    const { contractPath, dbConnection, logLevel, port, host, swaggerEnabled, serviceName, serviceDesc } = runtimeConfig;
    const log = getLogger(logLevel, 'server');

    try {
        await initDb(dbConnection, log);

        const fastify = (await import('fastify')).default;
        const listenAddress = `http://${host}:${port}`;
        const swaggerUiPath = '/swagger-ui';
        const apiSpecs = getContracts(contractPath);
        // Bind hosts like 0.0.0.0 are valid for listening inside Docker, but they are not
        // a client-facing URL. Publish a relative OpenAPI server URL so docs work on whatever
        // host and reverse-proxy path serves this app.
        const apiSpec = mergeContracts(apiSpecs, contractPath, serviceName, serviceDesc, logLevel);

        // ------------------------------
        // Build orchestration action registry (startup-time only)
        // ------------------------------
        const registry = new ActionRegistry();
        await loadOrchestrationActions(join(__dirname, '../orchestration/actions'), registry);

        // Optionally load user-provided actions (append-only).
        // Config key is optional; if present, it must be a directory path.
        if (runtimeConfig.orchestrationActionsPath) {
            await loadOrchestrationActions(runtimeConfig.orchestrationActionsPath, registry);
        }

        // ------------------------------
        // Build immutable external service registry (startup-time only)
        // ------------------------------
        const externalServices = ExternalServiceRegistry.fromConfig(runtimeConfig?.raw ?? {});

        // Initialize Fastify app
        const fastifyConfig = getFastifyConfig(logLevel, 'server');
        const app = fastify(fastifyConfig);

        // Decorate app with config and contract
        app.decorate('config', runtimeConfig)
        app.decorate('openapiSpec', apiSpec);

        // Decorate orchestration registry (immutable at runtime)
        app.decorate('orchestrationActions', registry);

        // Decorate external service registry (immutable at runtime)
        app.decorate('externalServices', externalServices);

        app.addContentTypeParser('text/plain', { parseAs: 'string' }, (req, body, done) => done(null, body));

        // Register plugins
        await app.register(ajvPlugin);
        await app.register(errorsPlugin);
        await app.register(corsPlugin, config.cors ?? {});
        await app.register(hooksPlugin, { openapiSpec: apiSpec });
        await app.register(staticPlugin);
        await app.register(securityPlugin, {
            openapiSpec: apiSpec,
            runtimeSecurity: runtimeConfig.security
        });
        await app.register(controllersPlugin, { openapiSpec: apiSpec});
        if (swaggerEnabled) {
            await swaggerPlugin(app, apiSpec);
        }

        // Start server
        await app.ready();
        if (process.env.NODE_ENV !== 'test') {
            await app.listen({ port, host });
        }

        app.log.info(
            {
                event: 'server_started',
                params: { listenAddress, openApiServerUrl: '/' }
            },
            'server_started: listening on %s', listenAddress
        );

        if (swaggerEnabled) {
            app.log.info(
                {
                    event: 'swagger_ui_started',
                    params: { route: swaggerUiPath, openApiServerUrl: '/' }
                },
                'swagger_ui_started: %s', swaggerUiPath
            );
        }

        return app;
    } catch (err) {
        const listenErrorMessage = getListenErrorMessage(err, { port, host });
        const message = listenErrorMessage ?? err.message ?? 'Server startup failed';
        const params = { ...(err.params ?? {}) };
        if (listenErrorMessage) {
            params.port = port;
            params.host = host;
        }
        // Log at fatal level since process will exit
        log.fatal(
            {
                event: err.code ?? err.event ?? 'server_start_failed',
                params
            },
            message
        );
        if (process.env.NODE_ENV !== 'test') {
            process.exit(1);
        } else {
            throw err;
        }
    }
}

function getListenErrorMessage(err, { port, host }) {
    if (!err || err.code !== 'EACCES' || err.syscall !== 'listen') {
        return null;
    }
    const bindHost = host || 'localhost';
    return `Cannot bind to ${bindHost}:${port}. Ports below 1024 require elevated privileges on macOS/Linux. Try a port >= 1024 (e.g., 3000), run with sudo, or use a reverse proxy.`;
}

/**
 * CLI command handler for the start command
 * Loads configuration and starts the server
 */
export default async function serveCommand(options, command) {
    // Load default config as the base
    const defaultConfig = loadDefaultConfig();

    // Merge with provided config file if specified
    let mergedConfig = defaultConfig;
    if (options.config) {
        const userConfig = loadConfigFile(options.config, true);
        mergedConfig = mergeConfigs(defaultConfig, userConfig);
    }

    validateConfig(mergedConfig);

    const optionSource = (name) => command?.getOptionValueSource?.(name);
    const hasCliOption = (name) => {
        const source = optionSource(name);
        return source === 'cli' || source === 'env';
    };

    // CLI parameters have the highest priority; otherwise use config/default config.
    const contractPath = options.contract
        ? path.resolve(process.cwd(), options.contract)
        : getContractPath(mergedConfig.contracts);
    const dbConnection = hasCliOption('dbDir')
        ? getDbConnectionFromPath(options.dbDir)
        : getDbConnection(mergedConfig.database.connection);
    const logLevel = getLogLevel(hasCliOption('logLevel') ? options.logLevel : mergedConfig.logging?.level);
    const { host: configHost, port: configPort } = resolveServerConfig(mergedConfig.server);
    const port = hasCliOption('port') ? options.port : configPort;

    const config = {
        contractPath,
        dbConnection,
        logLevel,
        port,
        host: configHost,
        swaggerEnabled: mergedConfig.server?.swaggerUiEnabled ?? true,
        serviceName: mergedConfig.server?.serviceName ?? 'APIstry',
        serviceDesc: mergedConfig.server?.serviceDescription ?? 'OpenAPI contracts -> running services without writing code!',
        webDir: getLocalSitePath(mergedConfig.localSite),
        cors: getCorsConfig(mergedConfig.cors ?? mergedConfig.security?.cors),
        security: getSecurityConfig(mergedConfig.security),
        raw: {
            ...mergedConfig,
            server: {
                ...mergedConfig.server,
                host: configHost,
                port
            }
        }
    };

    await serverStart(config);
}

function getDbConnectionFromPath(dbDir) {
    if (dbDir === 'IN-MEMORY-DB') {
        return `sqlite://${dbDir}`;
    }
    const resolvedPath = path.resolve(process.cwd(), dbDir);
    return `sqlite://${resolvedPath}`;
}

function getLogLevel(cliLogLevel) {
    const level = (cliLogLevel || process.env.LOG_LEVEL || 'info').toLowerCase();
    const validLevels = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'];

    if (!validLevels.includes(level)) {
        throw new ConfigurationError(
            { level, validLevels },
            { message: `Invalid log level '${level}'. Valid levels: ${validLevels.join(', ')}` }
        );
    }
    return level;
}
