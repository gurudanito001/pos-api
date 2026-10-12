export interface ErrorDetail {
  field?: string;
  issue?: string;
  [key: string]: unknown;
}

export class AppError extends Error {
  statusCode: number;
  code: string;
  details?: ErrorDetail[];

  constructor(message: string, statusCode = 400, code = 'BAD_REQUEST', details?: ErrorDetail[]) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Bad Request', code = 'BAD_REQUEST', details?: ErrorDetail[]) {
    return new AppError(message, 400, code, details);
  }

  static unauthorized(message = 'Unauthorized', code = 'UNAUTHORIZED', details?: ErrorDetail[]) {
    return new AppError(message, 401, code, details);
  }

  static forbidden(message = 'Forbidden', code = 'FORBIDDEN', details?: ErrorDetail[]) {
    return new AppError(message, 403, code, details);
  }

  static notFound(message = 'Resource not found', code = 'NOT_FOUND', details?: ErrorDetail[]) {
    return new AppError(message, 404, code, details);
  }

  static conflict(message = 'Conflict', code = 'CONFLICT', details?: ErrorDetail[]) {
    return new AppError(message, 409, code, details);
  }

  static unprocessable(message = 'Unprocessable Entity', code = 'UNPROCESSABLE_ENTITY', details?: ErrorDetail[]) {
    return new AppError(message, 422, code, details);
  }

  static tooManyRequests(message = 'Rate limit exceeded', code = 'RATE_LIMIT_EXCEEDED', details?: ErrorDetail[]) {
    return new AppError(message, 429, code, details);
  }
}
