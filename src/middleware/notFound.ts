import type { Request, Response } from 'express';
import { sendError } from '../lib/response.js';

export default function notFound(req: Request, res: Response) {
  return sendError(req, res, 'NOT_FOUND', `Route ${req.method} ${req.originalUrl} not found`, [], 404);
}
