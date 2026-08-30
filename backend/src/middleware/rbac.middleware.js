import { ApiError } from '../utils/api-error.js';

/**
 * RBAC Authorization Middleware
 * Verifies that the authenticated user has one of the allowed roles.
 * Must be mounted AFTER authenticate middleware.
 *
 * @param  {...string} allowedRoles - List of permitted UserRole values (BUYER, SELLER, ADMIN)
 */
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required before authorization check'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(
          `Forbidden: Role '${req.user.role}' is not authorized to access this resource. Required: [${allowedRoles.join(', ')}]`
        )
      );
    }

    next();
  };
};
