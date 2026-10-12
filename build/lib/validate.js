"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseBody = parseBody;
exports.parseQuery = parseQuery;
exports.parseParams = parseParams;
exports.validateBody = validateBody;
exports.validateQuery = validateQuery;
exports.validateParams = validateParams;
const AppError_js_1 = require("./AppError.js");
function parseBody(schema, body) {
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
        const details = parsed.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            issue: issue.message,
        }));
        throw AppError_js_1.AppError.unprocessable('Validation failed', 'VALIDATION_ERROR', details);
    }
    return parsed.data;
}
function parseQuery(schema, query) {
    const parsed = schema.safeParse(query);
    if (!parsed.success) {
        const details = parsed.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            issue: issue.message,
        }));
        throw AppError_js_1.AppError.unprocessable('Validation failed', 'VALIDATION_ERROR', details);
    }
    return parsed.data;
}
function parseParams(schema, params) {
    const parsed = schema.safeParse(params);
    if (!parsed.success) {
        const details = parsed.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            issue: issue.message,
        }));
        throw AppError_js_1.AppError.unprocessable('Validation failed', 'VALIDATION_ERROR', details);
    }
    return parsed.data;
}
function validateBody(schema) {
    return (req, _res, next) => {
        try {
            req.body = parseBody(schema, req.body);
            next();
        }
        catch (error) {
            next(error);
        }
    };
}
function validateQuery(schema) {
    return (req, _res, next) => {
        try {
            req.query = parseQuery(schema, req.query);
            next();
        }
        catch (error) {
            next(error);
        }
    };
}
function validateParams(schema) {
    return (req, _res, next) => {
        try {
            req.params = parseParams(schema, req.params);
            next();
        }
        catch (error) {
            next(error);
        }
    };
}
