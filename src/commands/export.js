import cliLogConfig from "./utils/cliLogConfig.js";
import csv from 'fast-csv';
import fs from 'fs';
import getAdapter, {initDb} from "../db/index.js";
import path from 'path';
import {getCliLogger} from '../plugins/configPlugin.js';
import { ConfigurationError } from '../utils/errors.js';

export default async function exportCommand(options) {
    const log = getCliLogger('info');
    const config = getConfig(options);

    cliLogConfig('export', config);

    // make sure export directory exists
    fs.mkdirSync(config.exportDir, { recursive: true });

    const db = await initDb(config.dbConnection, log);
    const collections = await getCollections(config.collection);

    const exportResults = [];

    for (const collection of collections) {
        let items = await db.dbGet(collection, {}, {}); // todo: use batching for large collections
        items = removeDbIds(items);
        if (items.length > 0) {
            const actualFilePath = config.filePath || path.join(config.exportDir, `${collection}.${config.format}`);
            await writeFile(actualFilePath, items, config.format);
        }
        exportResults.push({ collection, exported: items.length });
    }

    console.table(exportResults);
    await db.disconnect();
    console.log(`Export completed. Exported ${collections.length} collections.`);
}

async function getCollections(collection) {
    const db = await getAdapter();
    if (collection) {
        return [collection];
    } else {
        const collections = (await db.getCollections()).filter(c => c !== 'undefined');
        if (collections.length === 0) {
            console.log('No collections found to export.');
            return [];
        }
        return collections;
    }
}

function removeDbIds(docs) {
    return docs.map(doc => {
        const { _id, ...rest } = doc;
        return rest;
    });
}

async function writeFile(filePath, docs, format) {
    if (format === 'json') {
        fs.writeFileSync(filePath, JSON.stringify(docs, null, 2));
    } else if (format === 'csv') {
        const headers = docs.length > 0 ? Object.keys(docs[0]) : [];
        await new Promise((resolve, reject) => {
            csv.writeToPath(filePath, docs, { headers })
                .on('error', reject)
                .on('finish', resolve);
        });
    }
}

function getConfig(options = {}) {
    const outputPath = path.resolve(path.normalize(options.outputPath));
    let collection = options.collection;
    let format = (options.format || 'csv').toLowerCase();

    if (!['csv', 'json'].includes(format)) {
        throw new ConfigurationError(
            { format, supported: ['csv', 'json'] },
            { message: `Unsupported export format '${format}'. Supported formats: csv, json` }
        );
    }

    const dbConnection = options.dbConnection;
    if (!dbConnection) {
        throw new ConfigurationError(
            {},
            { message: 'DB_CONNECTION environment variable is required. Set it in your environment or .env file' }
        );
    }

    const isFile = path.extname(outputPath) !== '';
    let exportDir, filePath;
    if (isFile) {
        exportDir = path.dirname(outputPath);
        const base = path.basename(outputPath, path.extname(outputPath));
        format = path.extname(outputPath).slice(1).toLowerCase();
        collection = base;
        filePath = outputPath;
    } else {
        exportDir = outputPath;
    }

    return {
        collection,
        dbConnection,
        exportDir,
        filePath,
        format,
        outputPath
    };
}
