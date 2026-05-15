import fp from 'fastify-plugin';

// ---------------------------------------------------------
// Plugin (NON-ENCAPSULATED)
// ---------------------------------------------------------
export async function errorsPlugin(app) {
    app.log.info({ event: 'errors_plugin_registered' }, 'errors_plugin_registered');

    app.setErrorHandler((err, req, reply) => {

        // ---------------------------------------
        // 422 Unprocessable Entity (special case)
        // ---------------------------------------
        if (
            err?.statusCode === 422 &&
            err?.event === 'unprocessable_entity' &&
            Array.isArray(err.params)
        ) {
            req.log.info(
                { event: err.event, params: err.params },
                'unprocessable_entity'
            );

            return reply.code(422).send(err.params);
        }

        const invalidQueryParams = getInvalidQueryParamsErrorItems(err, req);
        if (invalidQueryParams.length > 0) {
            req.log.info(
                { event: 'invalid_query_params', params: invalidQueryParams },
                'invalid_query_params'
            );

            return reply.code(422).send(invalidQueryParams);
        }

        const status = err.statusCode || (err.validation ? 400 : 500);

        // Fastify validation errors
        if (err.validation) {
            req.log.info(
                { event: 'validation_failed', params: err.validation },
                err
            );

            return reply.code(400).send({
                statusCode: 400,
                error: 'Bad Request',
                message: 'Validation failed'
            });
        }

        const level = status >= 500 ? 'error' : 'info';

        req.log[level](
            {
                event: err.event ?? 'request_failed',
                params: err.params ?? {}
            },
            err
        );

        return reply.code(status).send({
            statusCode: status,
            error: getErrorName(status),
            message: err.message || 'An error occurred'
        });
    });
}

function getInvalidQueryParamsErrorItems(err, req) {
    if (!Array.isArray(err?.validation) || err.validationContext !== 'querystring') {
        return [];
    }

    return err.validation
        .filter((item) => item?.keyword === 'additionalProperties')
        .map((item) => {
            const property = item?.params?.additionalProperty;
            const rejectedValue = property ? req.query?.[property] : undefined;

            return {
                objectName: 'querystring',
                property,
                rejectedValue: rejectedValue !== undefined && rejectedValue !== null
                    ? String(rejectedValue)
                    : undefined,
                message: property
                    ? `Query parameter '${property}' is not valid`
                    : 'Query parameter is not valid'
            };
        })
        .filter((item) => item.property);
}

function getErrorName(status) {
    switch (status) {
        case 400: return 'Bad Request';
        case 404: return 'Not Found';
        case 422: return 'Unprocessable Entity';
        case 500: return 'Internal Server Error';
        default: return 'Error';
    }
}

// 👇 THIS is the critical line
export default fp(errorsPlugin, {
    name: 'errors-plugin',
    encapsulate: false
});
