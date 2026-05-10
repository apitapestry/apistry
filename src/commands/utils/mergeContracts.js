import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { ConfigurationError } from '../../utils/errors.js';

/**
 * Returns true if the given object has the x-ignore-merge flag set.
 * @param {object} obj
 * @returns {boolean}
 */
function hasIgnoreMerge(obj) {
    return obj && obj['x-ignore-merge'] === true;
}

/**
 * Returns true if either value should ignore merge conflicts.
 * @param {any} existingVal
 * @param {any} incomingVal
 * @returns {boolean}
 */
function shouldIgnoreConflict(existingVal, incomingVal) {
    return hasIgnoreMerge(existingVal) || hasIgnoreMerge(incomingVal);
}

/**
 * Returns true if two values are different (deep comparison).
 * @param {any} a
 * @param {any} b
 * @returns {boolean}
 */
function isDifferent(a, b) {
    return JSON.stringify(a) !== JSON.stringify(b);
}

/**
 * Returns true if the only difference between two objects is the 'description' property.
 * @param {object} a
 * @param {object} b
 * @returns {boolean}
 */
function schemaDiff(a, b) {
    if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) return false;
    // Shallow copy without description
    const stripDesc = obj => {
        const { description, ...rest } = obj || {};
        return rest;
    };
    // Compare all fields except description
    return JSON.stringify(stripDesc(a)) === JSON.stringify(stripDesc(b)) && a.description !== b.description;
}

/**
 * Throws a ConfigurationError for a merge conflict.
 * @param {string} section
 * @param {string} key
 * @param {number} fileIdx
 * @param {number} prevIdx
 * @param {string[]} fileNames
 * @throws {ConfigurationError}
 */
function throwConflictError(section, key, fileIdx, prevIdx, fileNames) {
    throw new ConfigurationError(
        { section, key, files: [fileNames[prevIdx], fileNames[fileIdx]] },
        {
            message: `Conflict detected in section '${section}' for key '${key}' between files: ${fileNames[prevIdx]} and ${fileNames[fileIdx]}`
        }
    );
}

/**
 * Main entry: merges cleaned specs into a single OpenAPI document.
 * @param {Map<string,object>} apiSpecs - Map of filename to OpenAPI spec object
 * @param {string} contractsPath - Path to contracts directory or file
 * @param {string} serviceName - Service name for merged spec
 * @param {string} serviceDesc - Service description for merged spec
 * @param {string} logLevel - Log level (controls openapi.yml write)
 * @returns {object} - Final merged OpenAPI spec
 */
export function mergeContracts(apiSpecs, contractsPath, serviceName, serviceDesc, logLevel) {
    if (!apiSpecs || typeof apiSpecs[Symbol.iterator] !== 'function') {
        throw new ConfigurationError(
            {},
            {
                message: 'Contracts map is required'
            }
        );
    }

    const specs = [];
    for (const [fileName, spec] of apiSpecs) {
        if (spec && !spec.__fileName) {
            spec.__fileName = fileName;
        }
        specs.push(spec);
    }

    if (specs.length === 0) {
        throw new ConfigurationError(
            {},
            {
                message: 'No contracts provided to merge'
            }
        );
    }

    let apiSpec;
    if (specs.length === 1) {
        apiSpec = specs[0];
    } else {
        apiSpec = mergeOpenApiSpecs(specs);
        sanitizeMergedSpec(apiSpec, serviceName, serviceDesc);
        writeMergedSpec(apiSpec, contractsPath, logLevel);
    }

    stripInternalMetadata(apiSpec);

    // Use a relative server URL so Swagger/OpenAPI works correctly behind reverse proxies
    // and on any host the app is served from.
    apiSpec.servers = [{ url: '/' }];

    return apiSpec;
}

/**
 * Merges multiple OpenAPI specs into one, handling conflicts and merging all sections.
 * @param {object[]} specs - Array of OpenAPI spec objects
 * @returns {object} - Merged OpenAPI spec
 */
function mergeOpenApiSpecs(specs) {
    const merged = JSON.parse(JSON.stringify(specs[0]));

    // Ensure each spec has a file name for error reporting.
    for (const spec of specs) {
        if (!spec.__fileName && spec.info && spec.info.title) {
            spec.__fileName = spec.info.title;
        }
    }

    const fileNames = specs.map(s => s.__fileName || 'spec');

    const pathOpSource = new Map();
    const componentSource = new Map();
    const tagSource = new Map();
    const serverSource = new Map();
    const extensionSource = new Map();

    for (let index = 1; index < specs.length; index++) {
        const spec = specs[index];

        mergePaths(merged, spec, index, pathOpSource, fileNames);
        mergeComponents(merged, spec, index, componentSource, fileNames);
        mergeTags(merged, spec, index, tagSource, fileNames);
        mergeServers(merged, spec, index, serverSource, fileNames);
        mergeSecurity(merged, spec);
        mergeExtensions(merged, spec, index, extensionSource, fileNames);
    }

    return merged;
}

/**
 * Merges the components section of an OpenAPI spec.
 * @param {object} merged - The merged spec being built
 * @param {object} spec - The incoming spec
 * @param {number} i - Index of the incoming spec
 * @param {Map} componentSource - Tracks source of each component
 * @param {string[]} fileNames - List of filenames for error reporting
 */
function mergeComponents(merged, spec, i, componentSource, fileNames) {
    if (!spec.components) return;

    merged.components = merged.components || {};
    for (const [section, defs] of Object.entries(spec.components)) {
        merged.components[section] = merged.components[section] || {};
        for (const [name, def] of Object.entries(defs)) {
            const existingDef = merged.components[section][name];
            const sourceKey = `${section}::${name}`;
            if (existingDef && !componentSource.has(sourceKey)) {
                componentSource.set(sourceKey, 0);
            }
            if (
                existingDef &&
                isDifferent(existingDef, def) &&
                !shouldIgnoreConflict(existingDef, def)
            ) {
                if (schemaDiff(existingDef, def)) {
                    // Warn and proceed, prefer keeping the existing description
                    console.warn(
                        `Warning: Schema conflict in components.${section} '${name}' between files: ${fileNames[componentSource.get(sourceKey) ?? 0]} and ${fileNames[i]}. Only the description differs. Proceeding with the first description.`
                    );
                    // Optionally, you could merge descriptions or prefer one; here we keep the existing
                } else {
                    throwConflictError(`components.${section}`, name, i, componentSource.get(sourceKey) ?? 0, fileNames);
                }
            }
            merged.components[section][name] = existingDef || def;
            componentSource.set(sourceKey, i);
        }
    }
}

/**
 * Merges the tags section of an OpenAPI spec.
 * @param {object} merged - The merged spec being built
 * @param {object} spec - The incoming spec
 * @param {number} i - Index of the incoming spec
 * @param {Map} tagSource - Tracks source of each tag
 * @param {string[]} fileNames - List of filenames for error reporting
 */
function mergeTags(merged, spec, i, tagSource, fileNames) {
    if (!spec.tags) return;

    const existing = new Map((merged.tags || []).map(t => [t.name, t]));
    merged.tags = merged.tags || [];
    for (const tag of spec.tags) {
        if (existing.has(tag.name)) {
            const prevTag = existing.get(tag.name);
            if (!tagSource.has(tag.name)) {
                tagSource.set(tag.name, 0);
            }
            if (isDifferent(prevTag, tag) && !shouldIgnoreConflict(prevTag, tag)) {
                throwConflictError('tags', tag.name, i, tagSource.get(tag.name) ?? 0, fileNames);
            }
        } else {
            merged.tags.push(tag);
            existing.set(tag.name, tag);
        }
        tagSource.set(tag.name, i);
    }
}

/**
 * Merges the servers section of an OpenAPI spec.
 * @param {object} merged - The merged spec being built
 * @param {object} spec - The incoming spec
 * @param {number} i - Index of the incoming spec
 * @param {Map} serverSource - Tracks source of each server
 * @param {string[]} fileNames - List of filenames for error reporting
 */
function mergeServers(merged, spec, i, serverSource, fileNames) {
    if (!spec.servers) return;

    const existing = new Map((merged.servers || []).map(s => [s.url, s]));
    merged.servers = merged.servers || [];
    for (const server of spec.servers) {
        if (existing.has(server.url)) {
            const prevServer = existing.get(server.url);
            if (!serverSource.has(server.url)) {
                serverSource.set(server.url, 0);
            }
            if (isDifferent(prevServer, server) && !shouldIgnoreConflict(prevServer, server)) {
                throwConflictError('servers', server.url, i, serverSource.get(server.url) ?? 0, fileNames);
            }
        } else {
            merged.servers.push(server);
            existing.set(server.url, server);
        }
        serverSource.set(server.url, i);
    }
}

/**
 * Merges the security section of an OpenAPI spec.
 * @param {object} merged - The merged spec being built
 * @param {object} spec - The incoming spec
 */
function mergeSecurity(merged, spec) {
    if (!spec.security) return;

    merged.security = merged.security || [];
    for (const sec of spec.security) {
        if (merged.security.some(s => JSON.stringify(s) === JSON.stringify(sec))) {
            continue;
        }
        merged.security.push(sec);
    }
}

/**
 * Merges OpenAPI extensions (x-*) from the incoming spec.
 * @param {object} merged - The merged spec being built
 * @param {object} spec - The incoming spec
 * @param {number} i - Index of the incoming spec
 * @param {Map} extensionSource - Tracks source of each extension
 * @param {string[]} fileNames - List of filenames for error reporting
 */
function mergeExtensions(merged, spec, i, extensionSource, fileNames) {
    for (const [k, v] of Object.entries(spec)) {
        if (k.startsWith('x-')) {
            if (k in merged && !extensionSource.has(k)) {
                extensionSource.set(k, 0);
            }
            if (k in merged && isDifferent(merged[k], v) && !shouldIgnoreConflict(merged[k], v)) {
                throwConflictError('extension', k, i, extensionSource.get(k) ?? 0, fileNames);
            }
            merged[k] = v;
            extensionSource.set(k, i);
        }
    }
}

/**
 * Merges the paths section of an OpenAPI spec.
 * @param {object} merged - The merged spec being built
 * @param {object} spec - The incoming spec
 * @param {number} i - Index of the incoming spec
 * @param {Map} pathOpSource - Tracks source of each path/operation
 * @param {string[]} fileNames - List of filenames for error reporting
 */
function mergePaths(merged, spec, i, pathOpSource, fileNames) {
    if (!spec.paths) {
        return;
    }

    merged.paths = merged.paths || {};
    for (const [p, def] of Object.entries(spec.paths)) {
        if (merged.paths[p]) {
            // Check for conflicts in operations (get, post, etc.)
            for (const [op, opDef] of Object.entries(def)) {
                const existingOp = merged.paths[p][op];
                const sourceKey = `${p}::${op}`;
                if (existingOp && !pathOpSource.has(sourceKey)) {
                    pathOpSource.set(sourceKey, 0);
                }
                if (
                    existingOp &&
                    isDifferent(existingOp, opDef) &&
                    !shouldIgnoreConflict(existingOp, opDef)
                ) {
                    throwConflictError('paths', `${p}.${op}`, i, pathOpSource.get(sourceKey) ?? 0, fileNames);
                }
            }
        }

        merged.paths[p] = { ...(merged.paths[p] || {}), ...def };

        for (const op of Object.keys(def)) {
            pathOpSource.set(`${p}::${op}`, i);
        }
    }
}

/**
 * Optional final cleanup of a merged contract when directory-based.
 * @param {object} apiSpec - The merged OpenAPI spec
 * @param {string} serviceName
 * @param {string} serviceDesc
 */
function sanitizeMergedSpec(apiSpec, serviceName, serviceDesc) {
    apiSpec.info = apiSpec.info || {};
    apiSpec.info.title = serviceName;
    apiSpec.info.description = serviceDesc;

    delete apiSpec.info.termsOfService;
    delete apiSpec.info.contact;
    delete apiSpec.info.license;
    delete apiSpec.externalDocs;

    if (Array.isArray(apiSpec.security) && apiSpec.security.length > 1) {
        apiSpec.security = [apiSpec.security[0]];
    }
}

/**
 * Removes internal metadata from the merged OpenAPI spec.
 * @param {object} apiSpec
 */
function stripInternalMetadata(apiSpec) {
    if (apiSpec && Object.prototype.hasOwnProperty.call(apiSpec, '__fileName')) {
        delete apiSpec.__fileName;
    }
}

/**
 * Writes the final merged YAML to a directory as openapi.yml if logLevel is 'debug'.
 * @param {object} apiSpec - The merged OpenAPI spec
 * @param {string} dir - Directory to write openapi.yml
 * @param {string} logLevel - Log level (must be 'debug' to write)
 */
function writeMergedSpec(apiSpec, dir, logLevel) {
    if (logLevel !== 'debug') {
        return;
    }
    const outputPath = path.join(dir, 'openapi.yml');
    try {
        fs.writeFileSync(outputPath, yaml.dump(apiSpec, { noRefs: true }), 'utf8');
    } catch (err) {
        throw new ConfigurationError(
            { path: outputPath },
            {
                message: `Failed to write merged OpenAPI spec: ${err.message}`,
                cause: err
            }
        );
    }
}
