/**
 * Orchestration validation model.
 *
 * We accumulate non-fatal validation entries and let the orchestrator decide how to respond.
 */

export const ValidationSeverity = Object.freeze({
    warning: 'warning',
    error: 'error',
    fatal: 'fatal'
});

/**
 * @typedef {Object} ValidationEntry
 * @property {'warning'|'error'|'fatal'} severity
 * @property {string} message
 * @property {string} [objectName]
 * @property {string} [property]
 * @property {string} [code]
 * @property {any} [rejectedValue]
 */

export function createValidationBag() {
    return {
        errors: /** @type {ValidationEntry[]} */ ([])
    };
}

export function addValidation(ctx, entry) {
    ctx.validation.errors.push({
        severity: entry.severity ?? ValidationSeverity.error,
        message: entry.message,
        objectName: entry.objectName,
        property: entry.property,
        code: entry.code,
        rejectedValue: entry.rejectedValue
    });
}

export function hasFatal(ctx) {
    return ctx.validation.errors.some(e => e.severity === ValidationSeverity.fatal);
}

export function hasNonFatalErrors(ctx) {
    return ctx.validation.errors.some(e => e.severity === ValidationSeverity.error);
}

