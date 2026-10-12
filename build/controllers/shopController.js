"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getShopProfile = getShopProfile;
exports.updateShopProfile = updateShopProfile;
exports.updatePreferences = updatePreferences;
const prisma_js_1 = require("../lib/prisma.js");
const response_js_1 = require("../lib/response.js");
async function getShopProfile(req, res, next) {
    try {
        const shop = await prisma_js_1.prisma.shop.findUnique({
            where: { id: req.shop.id },
            include: { user: true },
        });
        if (!shop) {
            return next(new Error('Shop not found'));
        }
        return (0, response_js_1.sendSuccess)(req, res, {
            id: shop.id,
            name: shop.name,
            phone: shop.user.phone,
            address: shop.address,
            coordinates: {
                latitude: shop.latitude,
                longitude: shop.longitude,
            },
            tier: shop.tier,
            language: shop.user.language,
            defaultProfitMargin: shop.defaultProfitMargin,
            notificationsEnabled: shop.notificationsEnabled,
            biometricsEnabled: shop.user.biometricEnabled,
            createdAt: shop.createdAt.toISOString(),
        });
    }
    catch (err) {
        next(err);
    }
}
async function updateShopProfile(req, res, next) {
    try {
        const { name, address, coordinates } = req.body;
        const updated = await prisma_js_1.prisma.shop.update({
            where: { id: req.shop.id },
            data: {
                name: name || undefined,
                address: address !== undefined ? address : undefined,
                latitude: coordinates?.latitude !== undefined ? coordinates.latitude : undefined,
                longitude: coordinates?.longitude !== undefined ? coordinates.longitude : undefined,
            },
        });
        return (0, response_js_1.sendSuccess)(req, res, {
            name: updated.name,
            address: updated.address,
            coordinates: {
                latitude: updated.latitude,
                longitude: updated.longitude,
            },
        }, 'Shop profile updated');
    }
    catch (err) {
        next(err);
    }
}
async function updatePreferences(req, res, next) {
    try {
        const { language, defaultProfitMargin, notificationsEnabled } = req.body;
        if (language) {
            await prisma_js_1.prisma.user.update({
                where: { id: req.user.id },
                data: { language },
            });
        }
        const shopUpdates = {};
        if (defaultProfitMargin !== undefined) {
            shopUpdates.defaultProfitMargin = Number(defaultProfitMargin);
        }
        if (notificationsEnabled !== undefined) {
            shopUpdates.notificationsEnabled = Boolean(notificationsEnabled);
        }
        const updatedShop = await prisma_js_1.prisma.shop.update({
            where: { id: req.shop.id },
            data: shopUpdates,
            include: { user: true },
        });
        return (0, response_js_1.sendSuccess)(req, res, {
            language: updatedShop.user.language,
            defaultProfitMargin: updatedShop.defaultProfitMargin,
            notificationsEnabled: updatedShop.notificationsEnabled,
        });
    }
    catch (err) {
        next(err);
    }
}
