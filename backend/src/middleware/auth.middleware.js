import { supabase } from '../config/supabase.js';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/api-error.js';

/**
 * Authentication Middleware
 * Validates the Bearer token using Supabase Auth, then resolves
 * the full user profile (including app role) from public.users via Prisma.
 */
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(ApiError.unauthorized('Authentication token is required. Format: Bearer <token>'));
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return next(ApiError.unauthorized('Authentication token is missing'));
    }

    // Verify token with Supabase Auth (replaces jwt.verify)
    const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(token);

    if (error || !supabaseUser) {
      if (error?.message?.toLowerCase().includes('expired')) {
        return next(ApiError.unauthorized('Authentication token has expired. Please log in again.'));
      }
      return next(ApiError.unauthorized('Invalid authentication token'));
    }

    // Resolve full app-level user profile from public.users
    const user = await prisma.user.findUnique({
      where: { id: supabaseUser.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return next(ApiError.unauthorized('User associated with this token no longer exists'));
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};
