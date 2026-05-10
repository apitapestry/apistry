import { addValidation, ValidationSeverity } from '../validation.js';
import { normalize } from '../../utils/normalize.js';

/**
 * contract.normalize.response
 *
 * Normalize the HTTP response payload according to the OpenAPI response schema.
 * Applies x-transforms and type coercion, detects collection wrappers declared
 * by the contract, but does NOT change top-level response shape.
 */
export function getDetails() {
    return {
        name: 'contract.normalize.response',

        description:
            'Normalize the HTTP response payload according to the OpenAPI response schema, ' +
            'applying transforms and type coercion without changing top-level response shape.',

        params: {
            source: {
                type: 'string',
                required: false,
                description:
                    'Name of orchestration variable containing the source response body to normalize. ' +
                    'Defaults to the current response body.'
            }
        }
    }
}

export default async function execute(ctx, params) {
    const schema = ctx.semantic?.response?.schema;
    if (!schema) return;

    // Resolve source (preferred orchestration model)
    const sourceName = typeof params?.source === 'string' ? params.source : undefined;
    const sourceVar = sourceName ? ctx.state.vars?.[sourceName] : undefined;

    let body = sourceVar && typeof sourceVar === 'object' && 'body' in sourceVar
        ? sourceVar.body
        : ctx.state.response.body;

    if (body === undefined || body === null) return;

    try {
        const collectionSource = schema['x-collection-source'];

        // Normalize wrapped collection items (WITHOUT unwrapping)
        if (
            collectionSource &&
            body &&
            typeof body === 'object' &&
            !Array.isArray(body) &&
            Array.isArray(body[collectionSource])
        ) {
            ctx.state.response.body = normalize(body, schema);

            ctx.state.meta = ctx.state.meta || {};
            ctx.state.meta.collectionSource = collectionSource;
            return;
        }

        ctx.state.response.body = normalize(body, schema);

    } catch (err) {
        addValidation(ctx, {
            severity: ValidationSeverity.fatal,
            message: err.message ?? 'contract.normalize.response failed',
            objectName: 'contract.normalize.response'
        });
    }
};
