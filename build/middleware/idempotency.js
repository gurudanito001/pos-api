"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleIdempotency = handleIdempotency;
const prisma_js_1 = require("../lib/prisma.js");
async function handleIdempotency(req, res, next) {
    const idempotencyKey = (req.headers['idempotency-key'] || req.headers['x-idempotency-key']);
    if (!idempotencyKey || (req.method !== 'POST' && req.method !== 'PUT' && req.method !== 'PATCH')) {
        return next();
    }
    try {
        const existing = await prisma_js_1.prisma.idempotencyRecord.findUnique({
            where: { key: idempotencyKey },
        });
        if (existing) {
            return res.status(existing.statusCode).json(existing.responseBody);
        }
        const originalJson = res.json.bind(res);
        res.json = (body) => {
            // Only cache successful or valid client responses
            if (res.statusCode >= 200 && res.statusCode < 500) {
                prisma_js_1.prisma.idempotencyRecord
                    .upsert({
                    where: { key: idempotencyKey },
                    update: { statusCode: res.statusCode, responseBody: body },
                    create: { key: idempotencyKey, statusCode: res.statusCode, responseBody: body },
                })
                    .catch((err) => {
                    console.error('Failed to store idempotency record:', err);
                });
            }
            return originalJson(body);
        };
        next();
    }
    catch (err) {
        next(err);
    }
}
