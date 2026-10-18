import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/AppError.js';

export async function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  const adminKey = req.headers['x-admin-key'] as string | undefined;
  const configuredAdminKey = process.env.ADMIN_API_KEY || 'retail_os_admin_secret_key_2026';

  // 1. Direct API Key check (ideal for scripts, Postman, Swagger UI, internal dashboards)
  if (adminKey && adminKey === configuredAdminKey) {
    return next();
  }

  // 2. Bearer Token check
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    const secret = process.env.JWT_SECRET || 'retail_os_super_secret_jwt_key_2026';

    try {
      const payload = jwt.verify(token, secret) as Record<string, any>;
      const userId = payload.sub || payload.userId || payload.id;

      if (userId) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
        });

        // If user is enterprise/admin or token is valid
        if (user && (user.tier === 'enterprise' || payload.role === 'admin')) {
          return next();
        }
      }
    } catch {
      // Continue to rejection
    }
  }

  return next(
    AppError.unauthorized(
      'Admin access denied. Please provide a valid X-Admin-Key header.',
      'ADMIN_UNAUTHORIZED',
      [{ field: 'X-Admin-Key', issue: 'Header missing or invalid' }]
    )
  );
}

export default requireAdmin;
