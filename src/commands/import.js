import cliLogConfig from "./utils/cliLogConfig.js";

import csv from 'fast-csv';
import fs from 'fs';
import getAdapter from "../db/index.js";
import path from 'path';
import { getResourceId } from "../utils/helpers.js";
import { initDb } from "../db/index.js";
import { v4 as uuidv4 } from "uuid";
import {getCliLogger} from '../plugins/configPlugin.js';
import { ConfigurationError } from '../utils/errors.js';

export default async function importCommand(options) {
    const log = getCliLogger('info');
    const config = getConfig(options);

    cliLogConfig('import', config);

    const files = await readFiles(config.inputPath);
    const db = await initDb(config.dbConnection, log);

    const importResults = [];

    for (const fileName of files) {
        const collection = path.basename(fileName, path.extname(fileName)).toLowerCase();
        const items = await readCollection(fileName, config.inputPath, config.max);
        const deleted = await clearCollection(collection, config.replace);
        const inserted = await loadCollection(collection, items);
        importResults.push({ collection, deleted, inserted });
    }

    console.table(importResults);
    await db.disconnect();
    console.log(`Import completed. Processed ${files.length} files.`);
}

export async function readFiles(inputPath) {
    if (!fs.existsSync(inputPath)) {
        throw new ConfigurationError({ inputPath }, { message: 'Input path not found' });
    }

    let files;
    const stat = fs.statSync(inputPath);
    if (stat.isDirectory()) {
        files = fs.readdirSync(inputPath)
            .filter(f => f.endsWith('.json') || f.endsWith('.csv'));
        if (files.length === 0) {
            throw new ConfigurationError({ inputPath }, { message: 'No import files found in the specified directory' });
        }
    } else if (stat.isFile()) {
        files = [path.basename(inputPath)];
    } else {
        throw new ConfigurationError({ inputPath }, { message: 'Invalid input path provided' });
    }
    return files;
}

export async function readCollection(fileName, inputPath, max) {
    const filePath = path.join(inputPath, fileName);
    const collection = path.basename(fileName, path.extname(fileName)).toLowerCase();
    const resourceId = getResourceId(collection);

    // Import + parse file
    let items = await readFile(filePath, fileName); // todo: read in batches for large files
    if (!items || items.length === 0) return [];

    // trim to max if provided
    if (max) {
        items = items.slice(0, max);
    }

    return setResourceIds(items, resourceId);
}

export async function clearCollection(collection, replace) {
    if (!replace) return 0;
    const db = await getAdapter();
    const delResults = await db.dbDelete(collection);
    return delResults.deleted;
}

export async function loadCollection(fileName, docs) {
    const collection = path.basename(fileName, path.extname(fileName)).toLowerCase();
    const db = await getAdapter();
    const result = await db.dbInsert(collection, docs);
    return result.inserted;
}

export function setResourceIds(body, resourceId) {
    const ensureId = (d) => {
        // Only set if missing/empty; preserve existing IDs.
        if (d[resourceId] === undefined || d[resourceId] === null || d[resourceId] === '') {
            d[resourceId] = uuidv4();
        }
        return d;
    };

    if (Array.isArray(body)) {
        return body.map((d) => ensureId(d));
    }

    const d = { ...body };
    ensureId(d);
    return [d];
}

export function getImportConfig(options = {}) {
    // Formerly getConfig(); exportable for reuse.
    const inputPath = path.resolve(path.normalize(options.inputPath));
    const replace = ['y', 'yes', 'true'].includes((options.replace || 'n').toLowerCase());
    let max = options.maxDocs;
    if (!max || isNaN(max) || max <= 0) {
        max = undefined;
    }

    const dbConnection = options.dbConnection;
    if (!dbConnection) {
        throw new ConfigurationError(
            {},
            { message: 'DB_CONNECTION environment variable is required. Set it in your environment or .env file' }
        );
    }

    return {
        inputPath,
        replace,
        max,
        dbConnection
    };
}

// Keep the old name as a private alias for backward compatibility inside this module.
function getConfig(options = {}) {
    return getImportConfig(options);
}

async function readFile(filePath, fileName) {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const ext = path.extname(fileName).toLowerCase();
    if (ext === '.json') {
        const parsed = JSON.parse(fileContent);
        return Array.isArray(parsed) ? parsed : [parsed];
    } else if (ext === '.csv') {
        return new Promise((resolve, reject) => {
            const results = [];
            csv.parseString(fileContent, { headers: true, skipEmptyLines: true })
                .on('data', (data) => results.push(data))
                .on('end', () => resolve(Array.isArray(results) ? results : [results]))
                .on('error', (err) => reject(err));
        });
    } else {
        throw new ConfigurationError(
            { fileType: ext, fileName },
            { message: `Unsupported file type '${ext}'. Supported types: .json, .csv` }
        );
    }
}
