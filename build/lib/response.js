"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRequestId = getRequestId;
exports.sendSuccess = sendSuccess;
exports.sendError = sendError;
function getRequestId(req) {
    if (req.requestId) {
        return req.requestId;
    }
    const id = 'req_' + Math.random().toString(36).substring(2, 10);
    req.requestId = id;
    return id;
}
function sendSuccess(req, res, data, message = 'Operation completed successfully', statusCode = 200, extraMeta) {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
        meta: {
            timestamp: new Date().toISOString(),
            requestId: getRequestId(req),
            ...extraMeta,
        },
    });
}
function sendError(req, res, code, message, details = [], statusCode = 400) {
    return res.status(statusCode).json({
        success: false,
        error: {
            code,
            message,
            details,
        },
        meta: {
            timestamp: new Date().toISOString(),
            requestId: getRequestId(req),
        },
    });
}
