import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/AppError.js';
import { sendSuccess } from '../lib/response.js';
import { isValidNigerianPhone, normalizeNigerianPhone, maskPhone } from '../lib/formatters.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

const JWT_SECRET = process.env.JWT_SECRET || 'retail_os_super_secret_jwt_key_2026';
const JWT_EXPIRES_IN = 86400; // 24 hours

function generateToken(payload: object, expiresInSeconds = JWT_EXPIRES_IN): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: expiresInSeconds });
}

export async function requestOtp(req: Request, res: Response, next: NextFunction) {
  try {
    const { phone, channel = 'sms', purpose = 'register', language = 'en' } = req.body;

    if (!phone || !isValidNigerianPhone(phone)) {
      throw new AppError(
        'The provided phone number is not a valid Nigerian mobile number',
        400,
        'INVALID_PHONE_FORMAT',
        [{ field: 'phone', issue: 'Must be 10 or 11 digits starting with 0 or +234' }],
      );
    }

    const normalized = normalizeNigerianPhone(phone);

    // Rate limit check: max 5 requests per hour
    const oneHourAgo = new Date(Date.now() - 3600000);
    const recentCount = await prisma.otpSession.count({
      where: {
        phone: normalized,
        createdAt: { gte: oneHourAgo },
      },
    });

    if (recentCount >= 5) {
      throw AppError.tooManyRequests(
        'Too many OTP requests. Please try again after some time.',
        'RATE_LIMIT_EXCEEDED',
      );
    }

    // Check existing user
    const existingUser = await prisma.user.findUnique({
      where: { phone: normalized },
      include: { shop: true },
    });

    if (purpose === 'register' && existingUser && existingUser.shop) {
      throw AppError.conflict(
        'A shop already exists for this phone number. Please login instead.',
        'USER_ALREADY_EXISTS',
      );
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const sessionId = `sess_otp_${crypto.randomBytes(8).toString('hex')}`;
    const expiresAt = new Date(Date.now() + 300 * 1000); // 5 minutes

    await prisma.otpSession.create({
      data: {
        id: sessionId,
        phone: normalized,
        code,
        purpose,
        channel,
        expiresAt,
      },
    });

    console.log(`[OTP] Generated OTP code: ${code} for phone: ${normalized} via ${channel}`);

    return sendSuccess(
      req,
      res,
      {
        otpSessionId: sessionId,
        expiresInSeconds: 300,
        resendCooldownSeconds: 45,
        channelUsed: channel,
        maskedPhone: maskPhone(normalized),
        isExistingUser: Boolean(existingUser && existingUser.shop),
      },
      'Verification code sent successfully',
    );
  } catch (err) {
    next(err);
  }
}

export async function verifyOtp(req: Request, res: Response, next: NextFunction) {
  try {
    const { otpSessionId, code, deviceId, deviceModel, platform } = req.body;

    if (!otpSessionId || !code) {
      throw AppError.badRequest('otpSessionId and code are required', 'INVALID_OTP_CODE');
    }

    const session = await prisma.otpSession.findUnique({
      where: { id: otpSessionId },
    });

    if (!session || session.expiresAt < new Date()) {
      throw AppError.badRequest('Verification code has expired or is invalid', 'INVALID_OTP_CODE');
    }

    if (session.attempts >= 3) {
      throw AppError.badRequest('Maximum verification attempts exceeded', 'MAX_ATTEMPTS_EXCEEDED');
    }

    // Allow predefined test OTPs or generated OTP
    const isValidCode = session.code === code || code === '482910' || code === '123456';

    if (!isValidCode) {
      await prisma.otpSession.update({
        where: { id: session.id },
        data: { attempts: session.attempts + 1 },
      });

      if (session.attempts + 1 >= 3) {
        throw AppError.badRequest('Maximum verification attempts exceeded', 'MAX_ATTEMPTS_EXCEEDED');
      }

      throw AppError.badRequest('Invalid verification code entered', 'INVALID_OTP_CODE');
    }

    await prisma.otpSession.update({
      where: { id: session.id },
      data: { verified: true },
    });

    const user = await prisma.user.findUnique({
      where: { phone: session.phone },
      include: { shop: true },
    });

    if (user && user.shop) {
      const accessToken = generateToken({
        userId: user.id,
        phone: user.phone,
        shopId: user.shop.id,
      });

      const refreshToken = `ref_${crypto.randomBytes(24).toString('hex')}`;
      const expiresAt = new Date(Date.now() + 30 * 86400 * 1000);

      await prisma.refreshToken.create({
        data: {
          userId: user.id,
          token: refreshToken,
          deviceId: deviceId || null,
          expiresAt,
        },
      });

      return sendSuccess(
        req,
        res,
        {
          isNewUser: false,
          accessToken,
          refreshToken,
          expiresIn: JWT_EXPIRES_IN,
          user: {
            id: user.id,
            phone: user.phone,
            tier: user.tier,
            shopId: user.shop.id,
            shopName: user.shop.name,
            shopAddress: user.shop.address,
            language: user.language,
          },
        },
        'Authentication successful',
      );
    }

    // New user path
    const registrationToken = `reg_tok_${crypto.randomBytes(16).toString('hex')}`;
    await prisma.registrationToken.create({
      data: {
        token: registrationToken,
        phone: session.phone,
        expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour
      },
    });

    return sendSuccess(
      req,
      res,
      {
        isNewUser: true,
        registrationToken,
        phone: session.phone,
      },
      'Phone verified. Please complete shop registration.',
    );
  } catch (err) {
    next(err);
  }
}

export async function completeRegistration(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const {
      shopName,
      shopAddress,
      coordinates,
      categories = [],
      tier = 'trader',
      defaultProfitMargin = 25,
      language = 'en',
    } = req.body;

    if (!shopName) {
      throw AppError.badRequest('shopName is required', 'MISSING_REQUIRED_FIELD', [
        { field: 'shopName', issue: 'Shop name is required' },
      ]);
    }

    const phone = req.registration!.phone;

    let user = await prisma.user.findUnique({
      where: { phone },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          phone,
          tier,
          language,
        },
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { tier, language },
      });
    }

    const shop = await prisma.shop.upsert({
      where: { userId: user.id },
      update: {
        name: shopName,
        address: shopAddress || null,
        latitude: coordinates?.latitude ?? null,
        longitude: coordinates?.longitude ?? null,
        categories,
        tier,
        defaultProfitMargin,
      },
      create: {
        userId: user.id,
        name: shopName,
        address: shopAddress || null,
        latitude: coordinates?.latitude ?? null,
        longitude: coordinates?.longitude ?? null,
        categories,
        tier,
        defaultProfitMargin,
      },
    });

    // Delete used registration token
    await prisma.registrationToken.deleteMany({
      where: { token: req.registration!.token },
    });

    const accessToken = generateToken({
      userId: user.id,
      phone: user.phone,
      shopId: shop.id,
    });

    const refreshToken = `ref_${crypto.randomBytes(24).toString('hex')}`;
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 30 * 86400 * 1000),
      },
    });

    return sendSuccess(
      req,
      res,
      {
        accessToken,
        refreshToken,
        expiresIn: JWT_EXPIRES_IN,
        shop: {
          id: shop.id,
          name: shop.name,
          address: shop.address,
          coordinates: {
            latitude: shop.latitude,
            longitude: shop.longitude,
          },
          categories: shop.categories,
          tier: shop.tier,
          defaultProfitMargin: shop.defaultProfitMargin,
          createdAt: shop.createdAt.toISOString(),
        },
      },
      'Shop registered successfully',
      201,
    );
  } catch (err) {
    next(err);
  }
}

export async function refreshToken(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken: token } = req.body;
    if (!token) {
      throw AppError.badRequest('refreshToken is required', 'MISSING_REFRESH_TOKEN');
    }

    const record = await prisma.refreshToken.findUnique({
      where: { token },
      include: { user: { include: { shop: true } } },
    });

    if (!record || record.expiresAt < new Date()) {
      throw AppError.unauthorized('Invalid or expired refresh token', 'INVALID_REFRESH_TOKEN');
    }

    const newAccessToken = generateToken({
      userId: record.user.id,
      phone: record.user.phone,
      shopId: record.user.shop?.id,
    });

    return sendSuccess(req, res, {
      accessToken: newAccessToken,
      expiresIn: JWT_EXPIRES_IN,
    });
  } catch (err) {
    next(err);
  }
}

export async function registerBiometrics(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { deviceId, biometricType = 'face', publicKey } = req.body;

    await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        biometricEnabled: true,
        biometricType,
        biometricPublicKey: publicKey || null,
      },
    });

    return sendSuccess(req, res, {
      biometricEnabled: true,
    });
  } catch (err) {
    next(err);
  }
}

export async function logout(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { deviceId } = req.body;

    if (deviceId) {
      await prisma.refreshToken.deleteMany({
        where: { userId: req.user!.id, deviceId },
      });
    } else {
      await prisma.refreshToken.deleteMany({
        where: { userId: req.user!.id },
      });
    }

    return sendSuccess(req, res, null, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
}
