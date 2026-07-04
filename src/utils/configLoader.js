import fs from 'fs';
import path from 'path';
import * as yaml from 'js-yaml';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { ConfigurationError } from './errors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Load the default configuration from the built-in config.default.yml file
 */
export function loadDefaultConfig() {
    try {
        const defaultConfigPath = getDefaultConfigPath();
        const raw = fs.readFileSync(defaultConfigPath, 'utf8');
        return yaml.load(raw) || {};
    } catch (err) {
        throw new ConfigurationError(
            {},
            { message: `Failed to load default configuration: ${err.message}`, cause: err }
        );
    }
}

function getDefaultConfigPath() {
    const sourceConfigPath = path.join(__dirname, '../config.default.yml');
    if (fs.existsSync(sourceConfigPath)) {
        return sourceConfigPath;
    }

    return path.join(__dirname, 'config.default.yml');
}

/**
 * Load a config file (JSON or YAML)
 */
export function loadConfigFile(configPath, substitute = true) {
    const absPath = path.resolve(process.cwd(), configPath);

    if (!fs.existsSync(absPath)) {
        throw new ConfigurationError(
            { path: absPath },
            { message: `Configuration file not found: ${absPath}` }
        );
    }

    const stat = fs.statSync(absPath);
    if (!stat.isFile()) {
        throw new ConfigurationError(
            { path: absPath },
            { message: `Configuration path is not a file: ${absPath}` }
        );
    }

    try {
        const raw = fs.readFileSync(absPath, 'utf8');
        let parsed;

        if (absPath.endsWith('.json')) {
            parsed = JSON.parse(raw);
        } else if (absPath.endsWith('.yml') || absPath.endsWith('.yaml')) {
            parsed = yaml.load(raw);
        } else {
            throw new ConfigurationError(
                { path: absPath },
                { message: `Unsupported config file type. Must be .json, .yml, or .yaml` }
            );
        }

        if (substitute) {
            return substituteEnvVars(parsed);
        } else {
            return parsed;
        }
    } catch (err) {
        if (err.name === 'ConfigurationError') throw err;
        throw new ConfigurationError(
            { path: absPath },
            { message: `Failed to parse config file: ${err.message}`, cause: err }
        );
    }
}

/**
 * Deep merge source config into target config
 * Values from source override values in target
 */
export function mergeConfigs(defaultConfig, overrideConfig) {
    return deepMerge(defaultConfig, overrideConfig);
}

function deepMerge(target, source) {
    if (!source || typeof source !== 'object' || Array.isArray(source)) {
        return source;
    }

    const result = { ...target };

    for (const key in source) {
        if (typeof source[key] === 'object' && !Array.isArray(source[key]) && source[key] !== null) {
            result[key] = deepMerge(result[key] || {}, source[key]);
        } else {
            result[key] = source[key];
        }
    }

    return result;
}

/**
 * Substitute environment variables in config values
 */
export function substituteEnvVars(obj) {
    if (typeof obj === 'string') {
        // Support both $VAR and ${VAR} syntax
        return obj
            .replace(/\$\{([^}]+)\}/g, (match, varName) => process.env[varName] || '')
            .replace(/\$([A-Z_][A-Z0-9_]*)/g, (match, varName) => process.env[varName] || '');
    } else if (Array.isArray(obj)) {
        return obj.map(substituteEnvVars);
    } else if (obj && typeof obj === 'object') {
        const result = {};
        for (const key in obj) {
            result[key] = substituteEnvVars(obj[key]);
        }
        return result;
    } else {
        return obj;
    }
}
