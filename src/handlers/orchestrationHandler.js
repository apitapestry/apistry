import { getOrchestrationConfig } from '../orchestration/extensions.js';
import { createOrchestrationContext } from '../orchestration/ctx.js';
import { finalizeResponse } from '../orchestration/finalizeResponse.js';
import { hasFatal, ValidationSeverity, addValidation } from '../orchestration/validation.js';

/**
 * Orchestration handler invoked when an operation contains orchestration extensions.
 *
 * This is still a Fastify handler signature, but it immediately builds a curated ctx
 * and then executes actions.
 */
export function createOrchestrationHandler({ registry }) {
    if (!registry) {
        throw new Error('createOrchestrationHandler requires an action registry');
    }

    return async function orchestrationHandler(request, reply) {
        const routeSchema = request.routeOptions?.schema;
        const orchestration = getOrchestrationConfig(routeSchema);

        // Safety: should only be called when orchestration exists.
        if (!orchestration) {
            reply.code(500).send({
                statusCode: 500,
                error: 'Internal Server Error',
                message: 'Orchestration handler invoked without x-orchestration'
            });
            return;
        }

        const ctx = createOrchestrationContext({ request, reply });

        try {
            for (const step of orchestration.steps) {
                if (!step?.action) {
                    addValidation(ctx, {
                        severity: ValidationSeverity.fatal,
                        message: 'Orchestration step missing action',
                        objectName: 'x-orchestration',
                        property: 'steps.action'
                    });
                }

                if (hasFatal(ctx)) break;

                const action = registry.get(step.action);
                if (!action) {
                    addValidation(ctx, {
                        severity: ValidationSeverity.fatal,
                        message: `Unknown action '${step.action}'`,
                        objectName: 'x-orchestration',
                        property: 'steps.action',
                        rejectedValue: step.action
                    });
                    break;
                }

                request.log.debug({ event: 'orchestration_step_start', action: step.action }, 'orchestration_step_start');
                await action.execute(ctx, step.params ?? {}, step);
                request.log.debug({ event: 'orchestration_step_end', action: step.action }, 'orchestration_step_end');

                if (hasFatal(ctx)) break;
            }

            // Always finalize via standard step.
            return await finalizeResponse(ctx);
        } catch (err) {
            // Fatal execution errors are thrown (boundary will format)
            // Ensure we don't leak ctx.
            request.log.error({ event: 'orchestration_failed' }, err);
            throw err;
        }
    };
}
