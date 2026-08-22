/**
 * Supabase Client — provides auth, database, storage
 */
import { createClient } from '@supabase/supabase-js';
import { env } from '@/config/env';
import { httpGet } from '@/utils/httpClient';

const supabaseUrl = env.SUPABASE_URL;
const supabasePublishableKey = env.SUPABASE_PUBLISHABLE_KEY;

export const hasSupabaseConfig = Boolean(supabaseUrl && supabasePublishableKey);

let supabase = null;

try {
  if (hasSupabaseConfig) {
    supabase = createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    });
  }
} catch (error) {
  console.warn('Supabase client initialization failed:', error);
}

export { supabase };
export default supabase;

export function getSupabaseHealthState() {
  if (!hasSupabaseConfig || !supabase) {
    return 'misconfigured';
  }

  return 'configured';
}

/**
 * Quick health check — resolves true if Supabase responds, false otherwise.
 * Useful for detecting paused projects / network issues.
 */
export async function checkSupabaseHealth() {
  if (!hasSupabaseConfig || !supabase) return false;

  // Prefer a real SDK call first to avoid false negatives from strict CORS/proxy rules.
  try {
    const { error } = await supabase.auth.getSession();
    if (!error) return true;
  } catch {
    // Fallback to HTTP probe below.
  }

  try {
    const res = await httpGet(
      `${supabaseUrl}/auth/v1/health`,
      { apikey: supabasePublishableKey }
    );
    // Any non-5xx response means the service is reachable.
    return res.status > 0 && res.status < 500;
  } catch {
    return false;
  }
}
