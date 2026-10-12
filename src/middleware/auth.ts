import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/AppError.js';

export interface AuthenticatedUser {
  id: string;
  phone: string;
  tier: string;
  language: string;
  biometricEnabled: boolean;
}

export interface AuthenticatedShop {
  id: string;
  userId: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  categories: string[];
  tier: string;
  defaultProfitMargin: number;
  notificationsEnabled: boolean;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  shop?: AuthenticatedShop;
  registration?: {
    phone: string;
    token: string;
  };
}

export async function requireAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(AppError.unauthorized('Authentication token is required', 'UNAUTHORIZED'));
  }

  const token = authHeader.slice(7).trim();
  const secret = process.env.JWT_SECRET || 'retail_os_super_secret_jwt_key_2026';

  try {
    const payload = jwt.verify(token, secret) as Record<string, any>;
    const userId = payload.sub || payload.userId || payload.id;

    if (!userId) {
      return next(AppError.unauthorized('Invalid authentication token', 'UNAUTHORIZED'));
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { shop: true },
    });

    if (!user) {
      return next(AppError.unauthorized('User session not found', 'UNAUTHORIZED'));
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
  } catch (err) {
    return next(AppError.unauthorized('Session has expired or is invalid. Please log in again.', 'UNAUTHORIZED'));
  }
}

export async function requireRegistrationToken(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(AppError.unauthorized('Registration token is required', 'UNAUTHORIZED'));
  }

  const token = authHeader.slice(7).trim();

  try {
    const record = await prisma.registrationToken.findUnique({
      where: { token },
    });

    if (!record || record.expiresAt < new Date()) {
      return next(AppError.unauthorized('Registration session has expired. Please verify your phone number again.', 'INVALID_REGISTRATION_TOKEN'));
    }

    req.registration = {
      phone: record.phone,
      token: record.token,
    };

    return next();
  } catch (err) {
    return next(err);
  }
}

export default requireAuth;
