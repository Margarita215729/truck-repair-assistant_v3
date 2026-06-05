/**
 * Supabase Client — provides auth, database, storage.
 *
 * Initialisation is attempted eagerly from build-time VITE_* env vars.
 * If those are absent (e.g. env vars were not set during the Vercel build),
 * AuthContext calls initSupabase() after fetching runtime config from
 * /api/config, updating the live-binding exports below so every service that
 * destructures { supabase, hasSupabaseConfig } sees the updated values.
 */
import { createClient } from '@supabase/supabase-js';
import { env } from '@/config/env';

const AUTH_OPTIONS = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
};

// Mutable references used internally and for the health check.
let _url = env.SUPABASE_URL;
let _key = env.SUPABASE_ANON_KEY;

// Live-binding exports — every service that does
//   import { supabase, hasSupabaseConfig } from '@/api/supabaseClient'
// picks up the updated values after initSupabase() is called because ES module
// named exports are live bindings to the declaring module's variable.
export let supabase = null;
export let hasSupabaseConfig = false;

// Eager initialisation from build-time env vars.
if (_url && _key) {
  try {
    supabase = createClient(_url, _key, AUTH_OPTIONS);
    hasSupabaseConfig = true;
    console.log('[supabaseClient] Initialised from build-time env vars.');
  } catch (err) {
    console.warn('[supabaseClient] Eager initialisation failed:', err);
  }
}

/**
 * Deferred initialisation — call this when Supabase credentials are obtained
 * at runtime (e.g. fetched from /api/config).  A no-op if already initialised.
 *
 * Returns true on success, false on failure.
 */
export function initSupabase(url, key) {
  if (!url || !key) {
    console.warn('[supabaseClient] initSupabase called with missing url or key.');
    return false;
  }
  if (hasSupabaseConfig && supabase) {
    // Already initialised — nothing to do.
    return true;
  }

  try {
    _url = url;
    _key = key;
    supabase = createClient(url, key, AUTH_OPTIONS);
    hasSupabaseConfig = true;
    console.log('[supabaseClient] Deferred initialisation succeeded.');
    return true;
  } catch (err) {
    console.error('[supabaseClient] Deferred initialisation failed:', err);
    return false;
  }
}

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
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${_url}/auth/v1/health`, {
      method: 'GET',
      headers: { apikey: _key },
      signal: controller.signal,
    });
    clearTimeout(timer);
    // Any non-5xx response means the service is reachable.
    return res.status > 0 && res.status < 500;
  } catch {
    return false;
  }
}
