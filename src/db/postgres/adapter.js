import { Pool } from "pg";
import { InternalServerError } from "../../utils/errors.js";
import { dbDelete } from "./dbDelete.js";
import { dbGet } from "./dbGet.js";
import { dbCount } from "./dbCount.js";
import { dbInsert } from "./dbInsert.js";
import { dbUpdate } from "./dbUpdate.js";
import { getSubResource, saveSubResource } from "./subResources.js";

let pool = null;
const initializedCollections = new Set();
const initInFlight = new Map();
// language=PostgreSQL
const POSTGRES_PING_SQL = "SELECT 1";
// language=PostgreSQL
const POSTGRES_LIST_COLLECTIONS_SQL = `
    SELECT table_name AS name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name ASC
`;

function parseConnectionString(conn) {
    const hasPostgresScheme = conn.startsWith("postgres://");
    const hasPostgresqlScheme = conn.startsWith("postgresql://");

    if (!hasPostgresScheme && !hasPostgresqlScheme) {
        throw new InternalServerError(
            "postgres_connection_invalid",
            { conn },
            { message: "PostgreSQL connection must start with postgres:// or postgresql://" }
        );
    }

    try {
        // URL parsing validates basic URI shape without altering the original string.
        // eslint-disable-next-line no-new
        new URL(conn);
    } catch (err) {
        throw new InternalServerError(
            "postgres_connection_parse_failed",
            { conn },
            { message: err.message }
        );
    }

    return conn;
}

function quoteIdentifier(value) {
    return `"${String(value).replace(/"/g, '""')}"`;
}

export async function connect(dbConnection, options = {}) {
    if (pool) return;

    const connectionString = parseConnectionString(dbConnection);

    try {
        pool = new Pool({ connectionString, ...options });
        await pool.query(POSTGRES_PING_SQL);
    } catch (err) {
        if (pool) {
            await pool.end().catch(() => {});
        }
        pool = null;

        throw new InternalServerError(
            "postgres_connection_failed",
            { connectionString },
            { message: err.message }
        );
    }
}

export async function disconnect() {
    if (pool) {
        await pool.end();
    }
    pool = null;
    initializedCollections.clear();
    initInFlight.clear();
}

export function getDb(collection) {
    if (!pool) {
        throw new InternalServerError(
            "postgres_not_initialized",
            {},
            { message: "PostgreSQL has not been initialized" }
        );
    }

    return {
        pool,
        collection,
        table: quoteIdentifier(collection)
    };
}

export async function ensureCollection(collection) {
    const db = getDb(collection);

    if (initializedCollections.has(collection)) {
        return db;
    }

    if (initInFlight.has(collection)) {
        await initInFlight.get(collection);
        return db;
    }

    // language=PostgreSQL
    const sql = `
        CREATE TABLE IF NOT EXISTS ${db.table} (
            id   TEXT PRIMARY KEY,
            body JSONB NOT NULL
        )
    `;

    const initPromise = db.pool
        .query(sql)
        .then(() => {
            initializedCollections.add(collection);
        })
        .finally(() => {
            initInFlight.delete(collection);
        });

    initInFlight.set(collection, initPromise);
    await initPromise;

    return db;
}

export async function ping() {
    if (!pool) {
        throw new InternalServerError(
            "postgres_not_initialized",
            {},
            { message: "PostgreSQL has not been initialized" }
        );
    }

    await pool.query(POSTGRES_PING_SQL);
    return { ok: 1 };
}

export async function getCollections() {
    if (!pool) return [];

    try {
        const result = await pool.query(POSTGRES_LIST_COLLECTIONS_SQL);

        return result.rows.map(row => row.name);
    } catch (err) {
        throw new InternalServerError(
            "postgres_list_collections_failed",
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
