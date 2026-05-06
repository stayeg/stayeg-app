/**
 * Supabase admin client using the service role key.
 *
 * SECURITY NOTE: This client bypasses Row-Level Security (RLS) policies.
 * Only use it for server-side operations that require elevated privileges
 * (e.g., admin operations, cross-user queries). Never expose this client
 * to the client side.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Use service_role key if available, otherwise fall back to anon key
const activeKey = supabaseServiceKey || supabaseAnonKey;
const isConfigured = Boolean(supabaseUrl && activeKey);

export const supabaseAdmin: SupabaseClient = isConfigured
  ? createClient(supabaseUrl, activeKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : (null as unknown as SupabaseClient);

export const isSupabaseAdminConfigured = isConfigured;
export const isUsingServiceRole = Boolean(supabaseServiceKey);
