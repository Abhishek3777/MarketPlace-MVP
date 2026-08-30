import { ApiError } from '../utils/api-error.js';
import { config } from '../config/env.js';

export const notFoundHandler = (req, res, next) => {
  next(new ApiError(404, `Route ${req.method} ${req.originalUrl} not found`));
};

export const errorHandler = (err, req, res, next) => {
  let error = err;

  // Handle Prisma Known Request Errors
  if (err.code === 'P2002') {
    const field = err.meta?.target?.[0] || 'Field';
    error = ApiError.conflict(`${field} already exists.`);
  } else if (err.code === 'P2025') {
    error = ApiError.notFound('Requested record was not found in the database.');
  } else if (err.code === 'P2003') {
    error = ApiError.badRequest('Foreign key constraint violation.');
  }

  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';
  const details = error.details || null;

  const response = {
    success: false,
    error: {
      code: statusCode,
      message,
      ...(details && { details }),
      ...(config.nodeEnv === 'development' && { stack: err.stack }),
    },
  };

  if (statusCode === 500 && config.nodeEnv === 'production') {
    response.error.message = 'An unexpected server error occurred.';
  }

  res.status(statusCode).json(response);
};
