import { initDb } from "../../db/index.js";
import { ConfigurationError } from '../../utils/errors.js';
import {
    clearCollection,
    loadCollection,
    readCollection,
} from '../import.js';

export default async function loadStage(config, configYml, dryRun, log) {
    if (!configYml) {
        throw new ConfigurationError('load_config_missing', {});
    }

    const sourceDirectory = configYml.sourceDirectory;
    const filenameStrategy = configYml['filename-strategy'];
    const collections = configYml.collections || [];
    const replace = configYml.replace === true;

    if (!sourceDirectory) {
        throw new ConfigurationError({ stage: 'load' }, { message: 'load.sourceDirectory is required' });
    }
    if (!filenameStrategy) {
        throw new ConfigurationError({ stage: 'load' }, { message: "load['filename-strategy'] is required" });
    }
    if (!Array.isArray(collections) || collections.length === 0) {
        throw new ConfigurationError({ stage: 'load' }, { message: 'load.collections must be a non-empty array' });
    }

    // Ensure DB adapter is initialized (import helpers expect adapter to be ready)
    await initDb(configYml.dbUrl, log);

    const loadResults = [];

    for (const collectionName of collections) {
        const fileNameForImportLogic = filenameStrategy.replace('{collection}', collectionName); // relative to sourceDirectory

        if (dryRun) {
            // Read + parse file to validate structure and report counts
            const items = await readCollection(fileNameForImportLogic, sourceDirectory, undefined);
            log.info(
                {
                    event: 'load_dryrun',
                    params: { collectionName, recordCount: items.length, replace }
                },
                'load_dryrun'
            );
            continue;
        }

        const deleted = await clearCollection(collectionName, replace);
        const items = await readCollection(fileNameForImportLogic, sourceDirectory, undefined);
        const inserted = await loadCollection(collectionName, items);

        loadResults.push({ collection: collectionName, deleted, inserted });

        log.info(
            {
                event: 'load_completed',
                params: { collectionName, deleted, inserted }
            },
            'load_completed'
        );
    }

    return loadResults;
}
