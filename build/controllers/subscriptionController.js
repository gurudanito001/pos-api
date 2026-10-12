"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upgradeSubscription = upgradeSubscription;
const crypto_1 = __importDefault(require("crypto"));
const prisma_js_1 = require("../lib/prisma.js");
const response_js_1 = require("../lib/response.js");
const TIER_PRICING = {
    trader: {
        monthly: 0,
        annual: 0,
        name: 'Trader Free',
    },
    medium_scale: {
        monthly: 9500,
        annual: 95000,
        name: 'Medium-Scale Business',
    },
    enterprise: {
        monthly: 24500,
        annual: 245000,
        name: 'Enterprise Business',
    },
};
async function upgradeSubscription(req, res, next) {
    try {
        const shopId = req.shop.id;
        const { targetTier = 'medium_scale', billingPeriod = 'monthly' } = req.body;
        const tierInfo = TIER_PRICING[targetTier] || TIER_PRICING.medium_scale;
        const amount = billingPeriod === 'annual' ? tierInfo.annual : tierInfo.monthly;
        const reference = `sub_ref_${crypto_1.default.randomBytes(6).toString('hex')}`;
        const authorizationUrl = `https://checkout.paystack.com/${reference.replace('sub_ref_', '')}`;
        await prisma_js_1.prisma.subscriptionUpgrade.create({
            data: {
                shopId,
                reference,
                targetTier,
                billingPeriod,
                amount,
                currency: 'NGN',
                status: 'pending',
                authorizationUrl,
                planName: tierInfo.name,
            },
        });
        return (0, response_js_1.sendSuccess)(req, res, {
            reference,
            amount,
            currency: 'NGN',
            authorizationUrl,
            planName: tierInfo.name,
        });
    }
    catch (err) {
        next(err);
    }
}
