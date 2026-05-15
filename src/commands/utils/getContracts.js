import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { ConfigurationError } from '../../utils/errors.js';

/**
 * Reads contract(s), cleans each spec, and returns a filename->spec map.
 * @param {string} contractsPath - Path to a contract file or directory
 * @returns {Map<string,object>} - Map of filename to cleaned OpenAPI spec
 * @throws {ConfigurationError} If path is invalid or no contracts found
 */
export function getContracts(contractsPath) {
    if (!contractsPath) {
        throw new ConfigurationError(
            {},
            { message: 'Contract path is required' }
        );
    }
    const { files } = resolveContracts(contractsPath);
    const specsByFile = new Map();

    for (const filePath of files) {
        const apiSpec = readSpec(filePath);
        removeQueryParameterExamples(apiSpec);
        stripXEtLTransform(apiSpec);

        const fileName = apiSpec?.__fileName ?? path.basename(filePath);
        if (specsByFile.has(fileName)) {
            throw new ConfigurationError(
                { file: fileName },
                { message: `Duplicate contract filename detected: ${fileName}` }
            );
        }

        specsByFile.set(fileName, apiSpec);
    }

    return specsByFile;
}

/**
 * Resolves a contract path to a list of YAML files.
 * @param {string} contractPath
 * @returns {{ files: string[] }}
 * @throws {ConfigurationError} If path is invalid or no YAML files found
 */
function resolveContracts(contractPath) {
    if (!fs.existsSync(contractPath)) {
        throw new ConfigurationError(
            { path: contractPath },
            { message: `Contract path not found: ${contractPath}` }
        );
    }
    const stat = fs.statSync(contractPath);
    if (stat.isFile()) {
        return { files: [contractPath] };
    }
    if (!stat.isDirectory()) {
        throw new ConfigurationError(
            { path: contractPath },
            { message: `Contract path invalid (not a directory): ${contractPath}` }
        );
    }
    const files = [];
    (function findYamlFiles(dir) {
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
            if (e.isDirectory()) findYamlFiles(path.join(dir, e.name));
            else if (e.isFile() && e.name.endsWith('.yaml')) files.push(path.join(dir, e.name));
        }
    })(contractPath);
    if (files.length === 0) {
        throw new ConfigurationError(
            { path: contractPath },
            { message: `No .yaml files found in contract directory: ${contractPath}` }
        );
    }
    return { files };
}

/**
 * Reads and parses a YAML OpenAPI contract file.
 * @param {string} filePath
 * @returns {object} Parsed OpenAPI spec
 * @throws {ConfigurationError} If YAML cannot be parsed
 */
function readSpec(filePath) {
    try {
        const spec = yaml.load(fs.readFileSync(filePath, 'utf8'));
        if (spec && !spec.__fileName) spec.__fileName = path.basename(filePath);
        return spec;
    } catch (err) {
        throw new ConfigurationError(
            { file: path.basename(filePath) },
            { message: `Failed to parse contract ${path.basename(filePath)}: ${err.message}`, cause: err }
        );
    }
}

/**
 * Removes "example" from all query parameters in the spec.
 * @param {object} spec
 */
function removeQueryParameterExamples(spec) {
    const strip = p => { if (p?.in === 'query' && 'example' in p) delete p.example; };
    for (const pathItem of Object.values(spec.paths ?? {}))
        for (const op of Object.values(pathItem ?? {}))
            op?.parameters?.forEach(strip);
    for (const param of Object.values(spec.components?.parameters ?? {}))
        strip(param);
}

/**
 * Removes 'x-etl-transforms' from first-level properties of each schema in components.schemas.
 * @param {object} apiSpec
 */
function stripXEtLTransform(apiSpec) {
    if (!apiSpec?.components?.schemas) return;
    for (const schema of Object.values(apiSpec.components.schemas)) {
        if (schema && typeof schema === 'object' && schema.properties && typeof schema.properties === 'object') {
            for (const prop of Object.values(schema.properties)) {
                if (prop && 'x-etl-transforms' in prop) delete prop['x-etl-transforms'];
            }
        }
    }
}
