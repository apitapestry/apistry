import fp from 'fastify-plugin';

export async function corsPlugin(app, options = {}) {
    const {
        enabled = true,
        origins = true,
        allowedHeaders = ['Content-Type', 'Authorization'],
        strictPreflight = false
    } = options;

    app.log.info({ event: 'cors_plugin_init', options: { ...options, origins } }, 'CORS plugin initializing');

    if (!enabled) {
        app.addHook('onReady', async () => {
            app.log.info({ event: 'cors_plugin_disabled' }, 'cors_plugin_disabled');
        });
        return;
    }

    const fastifyCors = (await import('@fastify/cors')).default;

    // Register CORS preflight handling for all methods
    await app.register(fastifyCors, {
        origin: origins,
        allowedHeaders,
        strictPreflight
    });

    app.addHook('onReady', async () => {
        app.log.info({ event: 'cors_plugin_registered', params: { enabled, origins } }, 'cors_plugin_registered');
    });
}

export default fp(corsPlugin, { name: 'cors-plugin' });
