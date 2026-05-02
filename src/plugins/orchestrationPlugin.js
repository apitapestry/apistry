import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Load orchestration actions from a directory and append them to a registry.
 *
 * @param {string} directoryPath - Directory containing action modules
 * @param {ActionRegistry} [registry] - Existing registry to append to
 * @returns {Promise<ActionRegistry>}
 */
export async function loadOrchestrationActions(directoryPath, registry) {
    if (!registry) {
        throw new Error('loadOrchestrationActions requires a registry instance');
    }
    const orchDir = path.resolve(directoryPath);
    const entries = await fs.readdir(orchDir, { withFileTypes: true });

    for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith('.js')) {
            continue;
        }

        const fullPath = path.resolve(orchDir, entry.name);

        let mod;
        try {
            mod = await import(fullPath);
        } catch (err) {
            throw new Error(`Failed to import action module '${fullPath}': ${err.message}`);
        }

        const execute = mod.default;
        const getDetails = mod.getDetails;

        if (typeof execute !== 'function') {
            throw new Error(`Action module '${entry.name}' must have a default export function`);
        }

        if (typeof getDetails !== 'function') {
            throw new Error(`Action module '${entry.name}' must export getDetails()`);
        }

        let details;
        try {
            details = getDetails();
        } catch (err) {
            throw new Error(`getDetails() failed for '${entry.name}': ${err.message}`);
        }

        if (!details || typeof details.name !== 'string') {
            throw new Error(`Action module '${entry.name}' returned invalid details (missing name)`);
        }

        registry.register({
            execute,
            details
        });
    }

    return registry;
}
