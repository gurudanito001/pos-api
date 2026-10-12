import type { Response, NextFunction } from 'express';
import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';
import { sendSuccess } from '../lib/response.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

const TIER_PRICING: Record<string, { monthly: number; annual: number; name: string }> = {
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

export async function upgradeSubscription(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const shopId = req.shop!.id;
    const { targetTier = 'medium_scale', billingPeriod = 'monthly' } = req.body;

    const tierInfo = TIER_PRICING[targetTier] || TIER_PRICING.medium_scale;
    const amount = billingPeriod === 'annual' ? tierInfo.annual : tierInfo.monthly;
    const reference = `sub_ref_${crypto.randomBytes(6).toString('hex')}`;
    const authorizationUrl = `https://checkout.paystack.com/${reference.replace('sub_ref_', '')}`;

    await prisma.subscriptionUpgrade.create({
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

    return sendSuccess(req, res, {
      reference,
      amount,
      currency: 'NGN',
      authorizationUrl,
      planName: tierInfo.name,
    });
  } catch (err) {
    next(err);
  }
}
