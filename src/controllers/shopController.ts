import type { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { sendSuccess } from '../lib/response.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

export async function getShopProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const shop = await prisma.shop.findUnique({
      where: { id: req.shop!.id },
      include: { user: true },
    });

    if (!shop) {
      return next(new Error('Shop not found'));
    }

    return sendSuccess(req, res, {
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
  } catch (err) {
    next(err);
  }
}

export async function updateShopProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { name, address, coordinates } = req.body;

    const updated = await prisma.shop.update({
      where: { id: req.shop!.id },
      data: {
        name: name || undefined,
        address: address !== undefined ? address : undefined,
        latitude: coordinates?.latitude !== undefined ? coordinates.latitude : undefined,
        longitude: coordinates?.longitude !== undefined ? coordinates.longitude : undefined,
      },
    });

    return sendSuccess(
      req,
      res,
      {
        name: updated.name,
        address: updated.address,
        coordinates: {
          latitude: updated.latitude,
          longitude: updated.longitude,
        },
      },
      'Shop profile updated',
    );
  } catch (err) {
    next(err);
  }
}

export async function updatePreferences(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { language, defaultProfitMargin, notificationsEnabled } = req.body;

    if (language) {
      await prisma.user.update({
        where: { id: req.user!.id },
        data: { language },
      });
    }

    const shopUpdates: any = {};
    if (defaultProfitMargin !== undefined) {
      shopUpdates.defaultProfitMargin = Number(defaultProfitMargin);
    }
    if (notificationsEnabled !== undefined) {
      shopUpdates.notificationsEnabled = Boolean(notificationsEnabled);
    }

    const updatedShop = await prisma.shop.update({
      where: { id: req.shop!.id },
      data: shopUpdates,
      include: { user: true },
    });

    return sendSuccess(req, res, {
      language: updatedShop.user.language,
      defaultProfitMargin: updatedShop.defaultProfitMargin,
      notificationsEnabled: updatedShop.notificationsEnabled,
    });
  } catch (err) {
    next(err);
  }
}
