/**
 * Supabase Client — provides auth, database, storage
 */
import { createClient } from '@supabase/supabase-js';
import { env, isDevelopment } from '@/config/env';

const supabaseUrl = env.SUPABASE_URL;
const supabaseAnonKey = env.SUPABASE_ANON_KEY;

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

let supabase = null;

try {
  if (hasSupabaseConfig) {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
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

/**
 * Quick health check — resolves true if Supabase responds, false otherwise.
 * Useful for detecting paused projects / network issues.
 */
export async function checkSupabaseHealth() {
  if (!hasSupabaseConfig || !supabase) return false;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'HEAD',
      headers: { apikey: supabaseAnonKey },
      signal: controller.signal,
    });
    clearTimeout(timer);
    return res.ok || res.status === 400; // 400 = alive but no table, still reachable
  } catch {
    return false;
  }
}
