"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.requireRegistrationToken = requireRegistrationToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_js_1 = require("../lib/prisma.js");
const AppError_js_1 = require("../lib/AppError.js");
async function requireAuth(req, _res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(AppError_js_1.AppError.unauthorized('Authentication token is required', 'UNAUTHORIZED'));
    }
    const token = authHeader.slice(7).trim();
    const secret = process.env.JWT_SECRET || 'retail_os_super_secret_jwt_key_2026';
    try {
        const payload = jsonwebtoken_1.default.verify(token, secret);
        const userId = payload.sub || payload.userId || payload.id;
        if (!userId) {
            return next(AppError_js_1.AppError.unauthorized('Invalid authentication token', 'UNAUTHORIZED'));
        }
        const user = await prisma_js_1.prisma.user.findUnique({
            where: { id: userId },
            include: { shop: true },
        });
        if (!user) {
            return next(AppError_js_1.AppError.unauthorized('User session not found', 'UNAUTHORIZED'));
        }
        req.user = {
            id: user.id,
            phone: user.phone,
            tier: user.tier,
            language: user.language,
            biometricEnabled: user.biometricEnabled,
        };
        if (user.shop) {
            req.shop = {
                id: user.shop.id,
                userId: user.shop.userId,
                name: user.shop.name,
                address: user.shop.address,
                latitude: user.shop.latitude,
                longitude: user.shop.longitude,
                categories: user.shop.categories,
                tier: user.shop.tier,
                defaultProfitMargin: user.shop.defaultProfitMargin,
                notificationsEnabled: user.shop.notificationsEnabled,
            };
        }
        return next();
    }
    catch (err) {
        return next(AppError_js_1.AppError.unauthorized('Session has expired or is invalid. Please log in again.', 'UNAUTHORIZED'));
    }
}
async function requireRegistrationToken(req, _res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(AppError_js_1.AppError.unauthorized('Registration token is required', 'UNAUTHORIZED'));
    }
    const token = authHeader.slice(7).trim();
    try {
        const record = await prisma_js_1.prisma.registrationToken.findUnique({
            where: { token },
        });
        if (!record || record.expiresAt < new Date()) {
            return next(AppError_js_1.AppError.unauthorized('Registration session has expired. Please verify your phone number again.', 'INVALID_REGISTRATION_TOKEN'));
        }
        req.registration = {
            phone: record.phone,
            token: record.token,
        };
        return next();
    }
    catch (err) {
        return next(err);
    }
}
exports.default = requireAuth;
