/**
 * Lazily initialised Supabase client reused across edge invocations.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cachedClient: SupabaseClient | null = null;

export function getClient(): SupabaseClient {
  if (cachedClient) {
    return cachedClient;
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Supabase credentials are missing. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }

  cachedClient = createClient(url, key, {
    auth: { persistSession: false },
    global: {
      headers: {
        'X-Client-Info': 'acta-mvp/0.1'
      }
    }
  });

  return cachedClient;
}
