"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
class AppError extends Error {
    statusCode;
    code;
    details;
    constructor(message, statusCode = 400, code = 'BAD_REQUEST', details) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        Object.setPrototypeOf(this, new.target.prototype);
        Error.captureStackTrace(this, this.constructor);
    }
    static badRequest(message = 'Bad Request', code = 'BAD_REQUEST', details) {
        return new AppError(message, 400, code, details);
    }
    static unauthorized(message = 'Unauthorized', code = 'UNAUTHORIZED', details) {
        return new AppError(message, 401, code, details);
    }
    static forbidden(message = 'Forbidden', code = 'FORBIDDEN', details) {
        return new AppError(message, 403, code, details);
    }
    static notFound(message = 'Resource not found', code = 'NOT_FOUND', details) {
        return new AppError(message, 404, code, details);
    }
    static conflict(message = 'Conflict', code = 'CONFLICT', details) {
        return new AppError(message, 409, code, details);
    }
    static unprocessable(message = 'Unprocessable Entity', code = 'UNPROCESSABLE_ENTITY', details) {
        return new AppError(message, 422, code, details);
    }
    static tooManyRequests(message = 'Rate limit exceeded', code = 'RATE_LIMIT_EXCEEDED', details) {
        return new AppError(message, 429, code, details);
    }
}
exports.AppError = AppError;
