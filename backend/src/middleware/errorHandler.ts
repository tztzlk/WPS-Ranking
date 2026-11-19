import { Request, Response, NextFunction } from 'express';

export interface ApiError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  error: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = error.statusCode || 500;
  // Internal errors (e.g. Prisma) can include connection details: log them, don't return them.
  const message =
    statusCode >= 500 && process.env.NODE_ENV === 'production'
      ? 'Internal Server Error'
      : error.message || 'Internal Server Error';

  console.error(`Error ${statusCode}: ${error.message}`, {
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
    stack: error.stack
  });

   if (res.headersSent) {
     // Delegate to Express' default error handling if headers are already sent.
     return next(error);
   }

  res.status(statusCode).json({
    error: message,
    status: statusCode,
    timestamp: new Date().toISOString()
  });
};
