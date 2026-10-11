import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  'https://epclxmqdbcbvwxdxwnbi.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

let clientInstance: SupabaseClient | null = null;

/**
 * Returns a server-only Supabase admin client using the service role key.
 * This client bypasses RLS and can perform administrative operations such as inviting users.
 * NEVER expose this client or SUPABASE_SERVICE_ROLE_KEY to the browser.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!clientInstance) {
    if (!supabaseServiceRoleKey) {
      throw new Error(
        'SUPABASE_SERVICE_ROLE_KEY is missing in server environment variables. Please add it to your server .env or hosting environment.'
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
