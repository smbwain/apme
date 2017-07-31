export function validation(validationError? : any, text? : string) : Error {
    const err = <any> new Error(`${text || 'Validation error'}: ${validationError.message}`);
    err.validation = validationError;
    err.httpCode = 400;
    return err;
}

export function unauthorized(str? : string) : Error {
    const err = <any> new Error(str || 'Unauthorized');
    err.httpCode = 401;
    return err;
}

export function forbidden(str? : string) : Error {
    const err = <any> new Error(str || 'Forbidden');
    err.httpCode = 403;
    return err;
}

export function notFound(str? : string) : Error {
    const err = <any> new Error(str || 'Not found');
    err.httpCode = 404;
    return err;
}

export function badRequest(str? : string) : Error {
    const err = <any> new Error(str || 'Bad Request');
    err.httpCode = 400;
    return err;
}

export function methodNotAllowed(str? : string) : Error {
    const err = <any> new Error(str || 'Method Not Allowed');
    err.httpCode = 405;
    return err;
}

export function conflict(str? : string) : Error {
    const err = <any> new Error(str || 'Conflict');
    err.httpCode = 409;
    return err;
}