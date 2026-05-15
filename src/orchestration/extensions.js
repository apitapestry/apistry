/**
 * Contract extensions for orchestration.
 *
 * Kept intentionally permissive so orchestration can evolve without breaking old specs.
 */

export const ORCHESTRATION_EXTENSION = 'x-orchestration';

/**
 * @typedef {Object} OrchestrationStep
 * @property {string} action Action name (e.g. "http.call")
 * @property {string} [id] Optional step id for referencing results
 * @property {Object} [params] Action-specific parameters
 */

/**
 * @typedef {Object} OrchestrationConfig
 * @property {OrchestrationStep[]} steps
 */

export function getOrchestrationConfig(routeSchema) {
    if (!routeSchema) return null;
    const raw = routeSchema[ORCHESTRATION_EXTENSION];
    if (!raw) return null;

    // Allow either {steps:[...]}, or a bare array that is treated as steps.
    if (Array.isArray(raw)) {
        return { steps: raw };
    }

    if (typeof raw === 'object' && Array.isArray(raw.steps)) {
        return { ...raw, steps: raw.steps };
    }

    // Unknown shape -> treat as absent (non-breaking)
    return null;
}

export function hasOrchestration(routeSchema) {
    return Boolean(getOrchestrationConfig(routeSchema));
}

