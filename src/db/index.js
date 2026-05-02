import mongoAdapter from "./mongo/adapter.js";
import sqlliteAdapter from "./sqlite/adapter.js";
import postgresAdapter from "./postgres/adapter.js";
import { ConfigurationError } from '../utils/errors.js';

let adapter = null;
let dbType = null;

export async function initDb(dbConnection = {}, logger) {
    if (!logger) {
        throw new ConfigurationError(
            { context: 'initDb' },
            { message: 'Logger is required for database initialization' }
        );
    }
    if (adapter) return adapter; // already initialized

    dbType = dbConnection.split(':')[0];
    switch (dbType) { // route to appropriate adapter
        // case "awsdocdb": // future support
        //     db = awsdocAdapter;
        //     break;
        case 'mongodb+srv':
        case 'mongo':
            adapter = mongoAdapter;
            break
        case 'sqlite':
            adapter = sqlliteAdapter;
            break;
        case 'postgres':
        case 'postgresql':
            adapter = postgresAdapter;
            break;
        default:
            throw new ConfigurationError(
                { dbType },
                { message: `Unsupported database type '${dbType}'. Supported types: sqlite, mongo, mongodb+srv, postgres, postgresql` }
            );
    }

    const maskedDbConnection = dbConnection.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
    await adapter.connect(dbConnection);

    logger.info(
        {
            event: 'db_connected',
            params: { dbType, connection: maskedDbConnection }
        },
        'db_connected'
    );

    return adapter;
}

export default async function getAdapter() {
    if (!adapter) {
        throw new ConfigurationError(
            {},
            { message: 'Database not initialized. Call initDb() at startup' }
        );
    }
    return adapter;
}
