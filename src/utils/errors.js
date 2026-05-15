/**
 * Structured Application Error
 *
 * - Errors are thrown, not logged
 * - Logging happens at boundaries only
 * - `event` is the stable semantic identifier
 * - `params` are structured facts
 * - `message` is a temporary, developer-facing description
 */
export class Errors extends Error {
    constructor(event, params = {}, options = {}) {
        const {
            message = event,
            statusCode = 500,
            cause
        } = options;

        super(message, { cause });

        this.name = this.constructor.name;
        this.event = event;
        this.params = params;
        this.statusCode = statusCode;
    }
}

/**
 * Pre-configured error types for common scenarios
 */
export class NotFoundError extends Errors {
    constructor(params = {}, options = {}) {
        super(
            'resource_not_found',
            params,
            { statusCode: 404, ...options }
        );
    }
}

export class ValidationError extends Errors {
    constructor(params = {}, options = {}) {
        super(
            'validation_failed',
            params,
            { statusCode: 400, ...options }
        );
    }
}

/**
 * 422 Unprocessable Entity
 *
 * INTERNAL: do not construct directly.
 * Use UnprocessableEntityErrorBuilder instead.
 * Always carries an ARRAY of ErrorItem
 */
export class UnprocessableEntityError extends Errors {
    constructor(errorItems, options = {}) {
        if (!Array.isArray(errorItems)) {
            throw new Error('UnprocessableEntityError requires an array of ErrorItem');
        }

        super(
            'unprocessable_entity',
            errorItems,
            { statusCode: 422, ...options }
        );
    }
}

export class UnprocessableEntityErrorBuilder {
    constructor() {
        this.items = [];
    }

    add({
            message,
            objectName,
            property,
            rejectedValue
        }) {

        if (!message) {
            throw new Error('UnprocessableEntityErrorBuilder.add requires message');
        }

        this.items.push({
            message,
            objectName,
            property,
            rejectedValue:
                rejectedValue !== undefined && rejectedValue !== null
                    ? String(rejectedValue)
                    : undefined
        });

        return this;
    }

    hasErrors() {
        return this.items.length > 0;
    }

    throwIfAny(options = {}) {
        if (this.items.length === 0) {
            return;
        }

        throw new UnprocessableEntityError(this.items, options);
    }

    // ✅ NEW: single-entry convenience
    static throwOne({
                      message,
                      objectName,
                      property,
                      rejectedValue
                  }, options = {}) {
        const builder = new UnprocessableEntityErrorBuilder();

        builder.add({
            message,
            objectName,
            property,
            rejectedValue
        });

        throw new UnprocessableEntityError(builder.items, options);
    }
}

export class ConfigurationError extends Errors {
    constructor(params = {}, options = {}) {
        super(
            'configuration_error',
            params,
            { statusCode: 500, ...options }
        );
    }
}

export class InternalServerError extends Errors {
    constructor(event, params = {}, options = {}) {
        super(event, params, { statusCode: 500, ...options });
    }
}
