import { supabase } from '../config/supabase.js';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/api-error.js';

/**
 * Register a new user.
 * 1. Creates auth identity in Supabase Auth (manages password).
 * 2. Mirrors the profile (name, role, email) into public.users via Prisma,
 *    using the same UUID returned by Supabase Auth.
 */
export const registerUser = async ({ name, email, password, role }) => {
  // Check if profile already exists (belt-and-suspenders — Supabase Auth also enforces unique emails)
  const existing = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (existing) {
    throw ApiError.conflict('An account with this email address already exists');
  }

  // Create auth user in Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: email.toLowerCase(),
    password,
    email_confirm: true, // auto-confirm for MVP (no email verification flow)
  });

  if (authError) {
    if (authError.message?.toLowerCase().includes('already registered')) {
      throw ApiError.conflict('An account with this email address already exists');
    }
    throw ApiError.internal(`Auth provider error: ${authError.message}`);
  }

  const supabaseUserId = authData.user.id;

  // Mirror profile into public.users using the Supabase Auth UUID as PK
  const newUser = await prisma.user.create({
    data: {
      id: supabaseUserId,
      name,
      email: email.toLowerCase(),
      role,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // Sign in immediately to get a session token for the response
  const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({
    email: email.toLowerCase(),
    password,
  });

  if (sessionError) {
    throw ApiError.internal(`Could not create session after registration: ${sessionError.message}`);
  }

  return {
    user: newUser,
    token: sessionData.session.access_token,
  };
};

/**
 * Log in an existing user.
 * Delegates credential verification entirely to Supabase Auth.
 */
export const loginUser = async ({ email, password }) => {
  const { data: sessionData, error: authError } = await supabase.auth.signInWithPassword({
    email: email.toLowerCase(),
    password,
  });

  if (authError || !sessionData.session) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const supabaseUserId = sessionData.user.id;

  // Fetch the app-level profile (role, name, etc.) from public.users
  const user = await prisma.user.findUnique({
    where: { id: supabaseUserId },
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
    throw ApiError.unauthorized('User profile not found. Please contact support.');
  }

  return {
    user,
    token: sessionData.session.access_token,
  };
};

/**
 * Get the current authenticated user's profile.
 */
export const getMe = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
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
    throw ApiError.unauthorized('User not found');
  }

  return user;
};
