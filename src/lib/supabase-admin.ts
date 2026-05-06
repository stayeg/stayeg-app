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

const isConfigured = Boolean(supabaseUrl && supabaseServiceKey);

export const supabaseAdmin: SupabaseClient = isConfigured
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : (null as unknown as SupabaseClient);

export const isSupabaseAdminConfigured = isConfigured;
