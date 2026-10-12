import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../lib/AppError.js';
import { sendError } from '../lib/response.js';

export default function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  // eslint-disable-next-line no-console
  console.error('Request Error:', err);

  if (err instanceof AppError) {
    return sendError(req, res, err.code, err.message, err.details ?? [], err.statusCode);
  }

  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      issue: issue.message,
    }));
    return sendError(req, res, 'VALIDATION_ERROR', 'Request validation failed', details, 422);
  }

  const message = err instanceof Error ? err.message : 'Internal Server Error';
  return sendError(req, res, 'INTERNAL_SERVER_ERROR', message, [], 500);
}
