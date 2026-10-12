"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = errorHandler;
const zod_1 = require("zod");
const AppError_js_1 = require("../lib/AppError.js");
const response_js_1 = require("../lib/response.js");
function errorHandler(err, req, res, _next) {
    // eslint-disable-next-line no-console
    console.error('Request Error:', err);
    if (err instanceof AppError_js_1.AppError) {
        return (0, response_js_1.sendError)(req, res, err.code, err.message, err.details ?? [], err.statusCode);
    }
    if (err instanceof zod_1.ZodError) {
        const details = err.issues.map((issue) => ({
            field: issue.path.join('.'),
            issue: issue.message,
        }));
        return (0, response_js_1.sendError)(req, res, 'VALIDATION_ERROR', 'Request validation failed', details, 422);
    }
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return (0, response_js_1.sendError)(req, res, 'INTERNAL_SERVER_ERROR', message, [], 500);
}
