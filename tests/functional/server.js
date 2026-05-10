import path from 'path';
import { serverStart } from '../../src/commands/serverStart.js';

export function useTestServer(contractPath, overrides = {}) {
    let server;

    return {
        setup: async () => {
            process.env.NODE_ENV = 'test';

            const resolvedPath = path.resolve(process.cwd(), contractPath);

            server = await serverStart({
                contractPath: resolvedPath,
                dbConnection: 'sqlite://IN-MEMORY-DB',
                logLevel: 'debug',
                swaggerEnabled: false,
                serviceName: 'Test API',
                serviceDesc: 'Test API',
                logMode: 'test',
                host: '0.0.0.0',
                port: 3000,
                ...overrides
            });
        },

        teardown: async () => {
            if (server) {
                await server.close();
            }
        },

        getServer: () => server
    };
}
