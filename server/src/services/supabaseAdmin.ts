import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

let clientInstance: SupabaseClient | null = null;

/**
 * Returns a server-only Supabase admin client using the service role key.
 * This client bypasses RLS and can perform administrative operations such as inviting users.
 * NEVER expose this client or SUPABASE_SERVICE_ROLE_KEY to the browser.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!clientInstance) {
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.warn(
        '[SupabaseAdmin] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not defined. Admin Auth features will fail until configured.'
      );
    }
    clientInstance = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return clientInstance;
}
