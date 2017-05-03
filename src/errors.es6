
export function validationError(validationError, text) {
    const err = new Error(`${text || 'Validation error'}: ${validationError.message}`);
    err.validation = validationError;
    err.httpCode = 400;
    return err;
}

export function unauthorizedError(str) {
    const err = new Error(str || 'Unauthorized');
    err.httpCode = 401;
    return err;
}

export function forbiddenError(str) {
    const err = new Error(str || 'Forbidden');
    err.httpCode = 403;
    return err;
}

export function notFoundError(str) {
    const err = new Error(str || 'Not found');
    err.httpCode = 404;
    return err;
}

export function badRequestError(str) {
    const err = new Error(str || 'Bad Request');
    err.httpCode = 400;
    return err;
}

export function methodNotAllowedError(str) {
    const err = new Error(str || 'Method Not Allowed');
    err.httpCode = 405;
    return err;
}

export function jsonErrorHandler(options = {}) {
    const debug = ('debug' in options) ? !!options.debug : true;
    const errorLog = options.errorLog || (err => { console.error(err.stack || err) });
    return (err, req, res, next) => {
        errorLog(err);
        res.status(err.httpCode || 500).json({
            errors: [{
                title: err.message,
                meta: {
                    stack: (debug && err.stack) ? err.stack.split('\n') : undefined,
                    validation: err.validation
                }
            }]
        });
    };
}