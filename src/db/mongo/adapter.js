import { InternalServerError } from "../../utils/errors.js";
import { MongoClient } from "mongodb";
import { dbCount } from "./dbCount.js";
import { dbDelete } from "./dbDelete.js";
import { dbGet } from "./dbGet.js";
import { dbInsert } from "./dbInsert.js";
import { dbUpdate } from "./dbUpdate.js";
import { getSubResource, saveSubResource } from "./subResources.js";

let client = null;
let db = null;

function parseConnectionString(conn) {
    if (!conn.startsWith("mongodb://") && !conn.startsWith("mongodb+srv://")) {
        throw new InternalServerError(
            "mongodb_connection_invalid",
            { conn },
            { message: "MongoDB connection must be a valid mongodb:// or mongodb+srv:// URI" }
        );
    }

    return conn;
}

/**
 * Connect to MongoDB.
 */
export async function connect(dbConnection, options = {}) {
    if (client) return;

    const uri = parseConnectionString(dbConnection);

    try {
        client = new MongoClient(uri, {
            ignoreUndefined: true,
            ...options
        });

        await client.connect();

        // If db name is in URI, this resolves correctly.
        // Otherwise Mongo uses "test" unless overridden.
        db = client.db(options.dbName);

    } catch (err) {
        client = null;
        db = null;

        throw new InternalServerError(
            "mongodb_connection_failed",
            { uri },
            { message: err.message }
        );
    }
}

/**
 * Disconnect from MongoDB.
 */
export async function disconnect() {
    if (client) {
        await client.close();
    }

    client = null;
    db = null;
}

/**
 * Get a MongoDB collection.
 */
export function getDb(collection) {
    if (!db) {
        throw new InternalServerError(
            "mongodb_not_initialized",
            {},
            { message: "MongoDB has not been initialized" }
        );
    }

    return db.collection(collection);
}

/**
 * Ping MongoDB.
 */
export async function ping() {
    if (!db) {
        throw new InternalServerError(
            "mongodb_not_initialized",
            {},
            { message: "MongoDB has not been initialized" }
        );
    }

    await db.command({ ping: 1 });
    return { ok: 1 };
}

/**
 * List collections in the database.
 */
export async function getCollections() {
    if (!db) return [];

    try {
        const cols = await db.listCollections().toArray();
        return cols.map(c => c.name);
    } catch (err) {
        throw new InternalServerError(
            "mongodb_list_collections_failed",
            {},
            { message: err.message }
        );
    }
}

export default {
    connect,
    dbCount,
    dbDelete,
    dbGet,
    dbInsert,
    dbUpdate,
    disconnect,
    getCollections,
    getDb,
    getSubResource,
    ping,
    saveSubResource
};
