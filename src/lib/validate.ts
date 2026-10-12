import type { ZodTypeAny } from 'zod';
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { AppError } from './AppError.js';

export function parseBody<T extends ZodTypeAny>(schema: T, body: unknown) {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      issue: issue.message,
    }));
    throw AppError.unprocessable('Validation failed', 'VALIDATION_ERROR', details);
  }
  return parsed.data;
}

export function parseQuery<T extends ZodTypeAny>(schema: T, query: unknown) {
  const parsed = schema.safeParse(query);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      issue: issue.message,
    }));
    throw AppError.unprocessable('Validation failed', 'VALIDATION_ERROR', details);
  }
  return parsed.data;
}

export function parseParams<T extends ZodTypeAny>(schema: T, params: unknown) {
  const parsed = schema.safeParse(params);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      issue: issue.message,
    }));
    throw AppError.unprocessable('Validation failed', 'VALIDATION_ERROR', details);
  }
  return parsed.data;
}

export function validateBody<T extends ZodTypeAny>(schema: T): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.body = parseBody(schema, req.body);
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function validateQuery<T extends ZodTypeAny>(schema: T): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.query = parseQuery(schema, req.query) as any;
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function validateParams<T extends ZodTypeAny>(schema: T): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.params = parseParams(schema, req.params) as any;
      next();
    } catch (error) {
      next(error);
    }
  };
}
