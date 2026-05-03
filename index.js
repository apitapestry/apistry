import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import awsLambdaFastify from '@fastify/aws-lambda';

import { buildServer } from './src/commands/serverStart.js';
import { loadConfigFile, loadDefaultConfig, mergeConfigs } from './src/utils/configLoader.js';
import {
    getContractPath,
    getCorsConfig,
    getDbConnection,
    getLocalSitePath,
    getSecurityConfig,
    resolveEnvVarOrValue,
    resolveServerConfig,
    validateConfig
} from './src/utils/configHelpers.js';
import { ConfigurationError } from './src/utils/errors.js';

let proxyPromise;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function handler(event, context) {
    const proxy = await getProxy();
    return proxy(event, context);
}

async function getProxy() {
    if (!proxyPromise) {
        proxyPromise = buildServer(getLambdaConfig(), { ready: false })
            .then(async (app) => {
                const proxy = awsLambdaFastify(app);
                await app.ready();
                return proxy;
            });
    }

    return proxyPromise;
}

function getLambdaConfig() {
    const defaultConfig = loadDefaultConfig();
    const configPath = process.env.CONFIG;
    const mergedConfig = configPath
        ? mergeConfigs(defaultConfig, loadConfigFile(configPath, true))
        : defaultConfig;

    validateConfig(mergedConfig);

    const { host, port } = resolveServerConfig(mergedConfig.server);
    const databaseConnection = getLambdaDatabaseConnection(mergedConfig.database.connection);
    const security = getLambdaSecurityConfig(mergedConfig.security);

    return {
        contractPath: process.env.CONTRACT
            ? path.resolve(process.cwd(), process.env.CONTRACT)
            : getContractPath(mergedConfig.contracts),
        dbConnection: getDbConnection(databaseConnection),
        logLevel: getLogLevel(process.env.LOG_LEVEL ?? mergedConfig.logging?.level),
        port,
        host,
        swaggerEnabled: mergedConfig.server?.swaggerUiEnabled ?? true,
        serviceName: mergedConfig.server?.serviceName ?? 'APIstry',
        serviceDesc: mergedConfig.server?.serviceDescription ?? 'OpenAPI contracts -> running services without writing code!',
        webDir: getLocalSitePath(mergedConfig.localSite),
        defaultOrchestrationActionsPath: getDefaultOrchestrationActionsPath(),
        cors: getCorsConfig(mergedConfig.cors ?? mergedConfig.security?.cors),
        security,
        raw: {
            ...mergedConfig,
            database: {
                ...mergedConfig.database,
                connection: databaseConnection
            },
            server: {
                ...mergedConfig.server,
                host,
                port
            }
        }
    };
}

function getDefaultOrchestrationActionsPath() {
    const lambdaActionsPath = path.join(__dirname, 'orchestration/actions');
    if (fs.existsSync(lambdaActionsPath)) {
        return lambdaActionsPath;
    }

    return path.join(__dirname, 'src/orchestration/actions');
}

function getLambdaDatabaseConnection(configConnection) {
    return process.env.DB_CONN
        ?? resolveEnvVarOrValue(configConnection);
}

function getLambdaSecurityConfig(configSecurity) {
    const security = getSecurityConfig(configSecurity);
    if (security) {
        return security;
    }

    const apiKey = process.env.API_KEY?.trim();
    if (!apiKey) {
        return undefined;
    }

    return {
        bearerToken: apiKey,
        apiKey: {
            key: 'apiKey',
            value: apiKey
        }
    };
}

function getLogLevel(configLogLevel) {
    const level = (configLogLevel || 'info').toLowerCase();
    const validLevels = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'];

    if (!validLevels.includes(level)) {
        throw new ConfigurationError(
            { level, validLevels },
            { message: `Invalid log level '${level}'. Valid levels: ${validLevels.join(', ')}` }
        );
    }

    return level;
}
