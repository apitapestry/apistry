import fs from "fs";
import path from "path";
import { InternalServerError } from "../../utils/errors.js";
import { dbDelete } from "./dbDelete.js";
import { dbGet } from "./dbGet.js";
import { dbCount } from "./dbCount.js";
import { dbInsert } from "./dbInsert.js";
import { dbUpdate } from "./dbUpdate.js";
import { getSubResource, saveSubResource } from "./subResources.js";

let sqliteDb = null;
let dbFilePath = null;
let Database = null;
const SQLITE_IN_MEMORY = "sqlite://IN-MEMORY-DB";
const SQLITE_LEGACY_IN_MEMORY = "sqllite://IN-MEMORY-DB";
// language=SQLite
const SQLITE_PING_SQL = "SELECT 1";
// noinspection SqlResolve
// language=SQLite
const SQLITE_LIST_TABLES_SQL = "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'";

/**
 * Parse and resolve the sqllite:// connection string.
 */
function parseConnectionString(conn) {
    if (conn === SQLITE_IN_MEMORY || conn === SQLITE_LEGACY_IN_MEMORY) {
        return { isInMemory: true, filePath: ":memory:" };
    }

    const hasSqlliteScheme = conn.startsWith("sqllite://");
    const hasSqliteScheme = conn.startsWith("sqlite://");

    if (!hasSqlliteScheme && !hasSqliteScheme) {
        throw new InternalServerError(
            "sqllite_connection_invalid",
            { conn },
            { message: "SQLite connection must start with sqllite:// or sqlite://" }
        );
    }

    const rawPath = hasSqlliteScheme
        ? conn.replace("sqllite://", "")
        : conn.replace("sqlite://", "");

    return { isInMemory: false, filePath: path.resolve(process.cwd(), rawPath) };
}

/**
 * Connect to SQLite – opens (or creates) the database file.
 */
export async function connect(dbConnection) {
    if (sqliteDb) return;

    const { isInMemory, filePath } = parseConnectionString(dbConnection);

    try {
        Database ??= await loadSqliteDriver();

        if (!isInMemory) {
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        }

        sqliteDb = new Database(filePath);
        // Enable WAL for better concurrent read performance.
        sqliteDb.pragma("journal_mode = WAL");

        dbFilePath = filePath;
    } catch (err) {
        sqliteDb = null;
        dbFilePath = null;
        throw new InternalServerError(
            "sqllite_connection_failed",
            { path: filePath },
            { message: err.message }
        );
    }
}

async function loadSqliteDriver() {
    try {
        const module = await import("better-sqlite3");
        return module.default ?? module;
    } catch (err) {
        if (err?.code === "ERR_MODULE_NOT_FOUND" || err?.code === "MODULE_NOT_FOUND") {
            throw new InternalServerError(
                "sqlite_dependency_missing",
                {},
                {
                    message: "SQLite support requires the optional dependency 'better-sqlite3'. Install it or use a mongo/postgres database connection."
                }
            );
        }

        throw err;
    }
}

/**
 * Disconnect – closes the SQLite database.
 */
export async function disconnect() {
    if (sqliteDb) {
        sqliteDb.close();
    }
    sqliteDb = null;
    dbFilePath = null;
}

/**
 * Returns the raw better-sqlite3 Database instance.
 * Ensures the table for the given collection exists.
 *
 * Table schema:
 *   id   TEXT PRIMARY KEY   — populated from the resource's <singular>Id field
 *   body TEXT               — full JSON document stored as a string
 */
export function getDb(collection) {
    if (!sqliteDb) {
        throw new InternalServerError(
            "sqllite_not_initialized",
            {},
            { message: "SQLite has not been initialized" }
        );
    }

    // Create the table if it doesn't already exist.
    // noinspection SqlResolve
    // language=SQLite
    sqliteDb.exec(`
        CREATE TABLE IF NOT EXISTS "${collection}" (
            id   TEXT PRIMARY KEY,
            body TEXT NOT NULL
        )
    `);

    return sqliteDb;
}

/**
 * Ping – verifies the database is open.
 */
export async function ping() {
    if (!sqliteDb) {
        throw new InternalServerError(
            "sqllite_not_initialized",
            {},
            { message: "SQLite has not been initialized" }
        );
    }
    // A cheap round-trip to confirm the DB is responsive.
    sqliteDb.prepare(SQLITE_PING_SQL).get();
    return { ok: 1 };
}

/**
 * List all tables (collections) in the database.
 */
export async function getCollections() {
    if (!sqliteDb) return [];

    try {
        const rows = sqliteDb
            .prepare(SQLITE_LIST_TABLES_SQL)
            .all();
        return rows.map(r => r.name);
    } catch (err) {
        throw new InternalServerError(
            "sqllite_list_collections_failed",
            {},
            { message: err.message }
        );
    }
}

export default {
    connect,
    disconnect,
    getDb,
    getCollections,
    ping,
    dbDelete,
    dbGet,
    dbCount,
    dbInsert,
    dbUpdate,
    getSubResource,
    saveSubResource
};
