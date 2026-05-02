import fs from 'fs/promises';
import path from 'path';
import SwaggerParser from '@apidevtools/swagger-parser';
import { ConfigurationError } from '../../utils/errors.js';
import { normalize } from '../../utils/normalize.js';

export default async function etlNormalize(normalizeConfig, options = {}, log) {
    const dryRun = options.dryRun === true;

    if (!normalizeConfig) {
        throw new ConfigurationError('normalize_config_missing', {});
    }

    const contractDirectory = normalizeConfig.contractDirectory;
    const sourceDirectory = normalizeConfig.sourceDirectory;
    const outputDirectory = normalizeConfig.outputDirectory;
    const filenameStrategy = normalizeConfig['filename-strategy'];
    const actions = normalizeConfig.actions || [];

    if (!dryRun) {
        await fs.mkdir(outputDirectory, { recursive: true });
    }

    for (const action of actions) {
        if (!action.contract) {
            throw new ConfigurationError(
                { action },
                { message: 'Normalize action missing required "contract" field' }
            );
        }
        if (!action.collection) {
            throw new ConfigurationError(
                { action },
                { message: 'Normalize action missing required "collection" field' }
            );
        }
        if (!action.schema) {
            throw new ConfigurationError(
                { action, collection: action.collection },
                { message: `Normalize action for collection '${action.collection}' missing required "schema" field` }
            );
        }

        const contractFile = path.join(contractDirectory, action.contract);
        const inputFile = path.join(
            sourceDirectory,
            `${action.collection}.json`
        );

        const outputName = action.output
            ? action.output
            : filenameStrategy.replace('{collection}', action.outputCollection || action.collection);

        const outputFile = path.join(outputDirectory, outputName);

        await fs.access(inputFile);

        // Load and fully resolve OpenAPI
        let openapi = await SwaggerParser.dereference(contractFile);
        openapi = resolveAllOfSchemas(openapi);

        const schema = resolveSchemaByName(openapi, action.schema);

        const raw = JSON.parse(await fs.readFile(inputFile, 'utf8'));
        if (!Array.isArray(raw)) {
            throw new ConfigurationError(
                { inputFile, collection: action.collection },
                { message: `Input file ${inputFile} must contain a JSON array` }
            );
        }

        const normalized = raw.map(item =>
            normalize(item, schema, true)
        );

        if (dryRun) {
            log.info(
                {
                    event: 'normalize_dryrun',
                    params: { collection: action.collection, outputFile, recordCount: normalized.length }
                },
                'normalize_dryrun'
            );
            continue;
        }

        await fs.writeFile(
            outputFile,
            JSON.stringify(normalized, null, 2),
            'utf8'
        );

        log.info(
            `normalize ${action.collection} → ${outputFile} (${normalized.length})`
        );
    }
}

/* --------------------------------------------------
 * helpers
 * -------------------------------------------------- */

function resolveSchemaByName(openapi, schemaName) {
    const schemas = openapi?.components?.schemas;
    if (!schemas) {
        throw new ConfigurationError(
            { contract: openapi?.info?.title },
            { message: 'No schemas found in contract components' }
        );
    }

    const schema = schemas[schemaName];
    if (!schema) {
        throw new ConfigurationError(
            { schemaName, availableSchemas: Object.keys(schemas) },
            { message: `Schema '${schemaName}' not found in contract` }
        );
    }

    if (schema.type !== 'object') {
        throw new ConfigurationError(
            { schemaName, schemaType: schema.type },
            { message: `Schema '${schemaName}' must be of type 'object', but is '${schema.type}'` }
        );
    }

    return schema;
}

/**
 * Resolve allOf definitions inside components.schemas by
 * merging referenced schema properties into the parent
 * and removing allOf.
 *
 * Assumes:
 * - OpenAPI is already dereferenced ($ref resolved)
 * - allOf is used only for structural composition
 */
function resolveAllOfSchemas(openapi) {
    const clone = structuredClone(openapi);
    const schemas = clone.components?.schemas;
    if (!schemas) return clone;

    for (const schema of Object.values(schemas)) {
        if (!Array.isArray(schema.allOf)) continue;

        const mergedProperties = {};
        const mergedRequired = new Set(schema.required || []);

        for (const part of schema.allOf) {
            if (part.properties) {
                Object.assign(mergedProperties, part.properties);
            }
            if (Array.isArray(part.required)) {
                part.required.forEach(r => mergedRequired.add(r));
            }
        }

        if (schema.properties) {
            Object.assign(mergedProperties, schema.properties);
        }

        schema.properties = mergedProperties;
        schema.required = mergedRequired.size ? [...mergedRequired] : undefined;
        delete schema.allOf;
    }

    return clone;
}
