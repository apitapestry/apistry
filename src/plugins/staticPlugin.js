import path from 'path';
import fs from 'fs';

/**
 * Conditionally serve static files from config.webDir.
 *
 * Usage:
 *   await app.register(staticPlugin);
 *
 * Config:
 *   config.webDir: string | undefined
 */
export async function staticPlugin(app) {
    const webDir = app?.config?.webDir;

    // Only register when explicitly set to a non-empty string.
    if (!webDir || (typeof webDir === 'string' && webDir.trim() === '')) {
        app.addHook('onReady', async () => {
            app.log.debug({ event: 'static_plugin_disabled' }, 'static_plugin_disabled');
        });
        return;
    }

    if (typeof webDir !== 'string') {
        throw new Error('staticPlugin: config.webDir must be a string');
    }

    const root = path.resolve(process.cwd(), webDir);
    if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
        throw new Error(`staticPlugin: config.webDir must point to an existing directory: ${root}`);
    }

    const fastifyStatic = (await import('@fastify/static')).default;

    // Register under '/' so it can serve index.html and assets.
    // We keep decorateReply:false to avoid surface area; we only need routing.
    await app.register(fastifyStatic, {
        root,
        prefix: '/',
        decorateReply: false,
        // Let Fastify handle index.html at '/'
        index: ['index.html']
    });

    app.addHook('onReady', async () => {
        app.log.info({ event: 'static_plugin_registered', params: { webDir: root } }, 'static_plugin_registered');
    });
}

