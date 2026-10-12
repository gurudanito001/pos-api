import type { Request, Response } from 'express';
import type { ErrorDetail } from './AppError.js';

export function getRequestId(req: Request): string {
  if ((req as any).requestId) {
    return (req as any).requestId;
  }
  const id = 'req_' + Math.random().toString(36).substring(2, 10);
  (req as any).requestId = id;
  return id;
}

export function sendSuccess<T>(
  req: Request,
  res: Response,
  data: T,
  message = 'Operation completed successfully',
  statusCode = 200,
  extraMeta?: Record<string, unknown>,
) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: getRequestId(req),
      ...extraMeta,
    },
  });
}

export function sendError(
  req: Request,
  res: Response,
  code: string,
  message: string,
  details: ErrorDetail[] = [],
  statusCode = 400,
) {
  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      details,
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: getRequestId(req),
    },
  });
}
