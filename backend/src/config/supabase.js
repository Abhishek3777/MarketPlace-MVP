import { createClient } from '@supabase/supabase-js';
import { config } from './env.js';

/**
 * Supabase Admin Client (Service Role)
 * Uses the service_role key — bypasses Row Level Security.
 * NEVER expose this client or key to the frontend.
 */
export const supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export default supabase;
