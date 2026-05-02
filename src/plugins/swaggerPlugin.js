export async function swaggerPlugin(app, api) {
    const fastifySwagger = (await import('@fastify/swagger')).default;
    const fastifySwaggerUi = (await import('@fastify/swagger-ui')).default;

    if (!api) {
        throw new Error('swaggerPlugin requires a contract');
    }
    const normalizedSwaggerPath = '/swagger-ui';
    await app.register(async function swaggerScoped(scope) {
        await scope.register(fastifySwagger, {
            mode: 'dynamic',
            openapi: api,
            transformObject: (documentObject) => {
                const openapiObject = documentObject.openapiObject || {};
                openapiObject.servers = [{ url: "/" }];
                return openapiObject;
            }
        });
        await scope.register(fastifySwaggerUi, {
            routePrefix: normalizedSwaggerPath,
            url: normalizedSwaggerPath + '/json',
            uiConfig: {
                docExpansion: 'list',
                deepLinking: true,
                displayRequestDuration: true,
                filter: true,
                syntaxHighlight: {
                    activate: true,
                    theme: 'monokai'
                },
                tryItOutEnabled: true
            },
            staticCSP: false
        });
    });
}
