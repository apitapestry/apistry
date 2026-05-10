/**
 * Action registry.
 *
 * Actions are orchestration-aware execution units and must:
 * - expose a default execute(ctx, params) function
 * - expose a getDetails() function for self-documentation
 *
 * Actions must NOT:
 * - receive Fastify req/reply
 * - send HTTP responses
 * - throw HTTP status codes directly
 */

export class ActionRegistry {
    constructor() {
        /** @type {Map<string, { execute: Function, details: { name: string, description?: string, params?: object } }>} */
        this.actions = new Map();
    }

    /**
     * Register an action.
     *
     * @param {{ execute: Function, details: { name: string, description?: string, params?: object } }} action
     */
    register(action) {
        if (!action || typeof action !== 'object') {
            throw new Error('ActionRegistry.register requires an action object');
        }

        if (typeof action.execute !== 'function') {
            throw new Error('ActionRegistry.register requires action.execute function');
        }

        const details = action.details;
        if (!details || typeof details !== 'object') {
            throw new Error('ActionRegistry.register requires action.details object');
        }

        if (typeof details.name !== 'string' || !details.name.trim()) {
            throw new Error('ActionRegistry.register requires details.name');
        }

        if (this.actions.has(details.name)) {
            throw new Error(`Action '${details.name}' is already registered`);
        }

        // Append-only, immutable-by-convention record.
        this.actions.set(details.name, { execute: action.execute, details });
    }

    /**
     * Retrieve an action record by name.
     *
     * @param {string} name
     * @returns {{ execute: Function, details: { name: string, description?: string, params?: object } } | undefined}
     */
    get(name) {
        return this.actions.get(name);
    }

    /**
     * Return all registered action records (for discovery/introspection).
     */
    getAllActions() {
        return Array.from(this.actions.values());
    }
}
