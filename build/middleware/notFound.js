"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = notFound;
const response_js_1 = require("../lib/response.js");
function notFound(req, res) {
    return (0, response_js_1.sendError)(req, res, 'NOT_FOUND', `Route ${req.method} ${req.originalUrl} not found`, [], 404);
}
