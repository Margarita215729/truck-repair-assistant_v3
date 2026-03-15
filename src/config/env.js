/**
 * Environment configuration
 * Reads env vars from Vite (VITE_ prefix) or window.__ENV__ (runtime injection).
 * Returns empty string for unconfigured optional vars — services must check
 * and throw their own errors for required configuration.
 */

// Known env var keys (not fallback values — just the list of supported keys)
const KNOWN_KEYS = [
  'SUPABASE_URL', 'SUPABASE_ANON_KEY', 'GITHUB_TOKEN',
  'GOOGLE_MAPS_API_KEY', 'GEMINI_API_KEY', 'YOUTUBE_API_KEY',
  'STRIPE_PUBLISHABLE_KEY', 'OWNER_PRICE_MONTHLY', 'OWNER_PRICE_ANNUAL',
  'FLEET_PRICE_MONTHLY', 'FLEET_PRICE_ANNUAL', 'APP_URL',
];

function getEnv(key) {
  // 1. Vite env vars (VITE_ prefix)
  try {
    const viteValue = import.meta.env?.[`VITE_${key}`] || import.meta.env?.[key];
    if (viteValue) return viteValue;
  } catch {
    // import.meta.env unavailable (SSR/test)
  }

  // 2. Window.__ENV__ (runtime injection)
  try {
    if (typeof window !== 'undefined' && window.__ENV__) {
      const windowValue = window.__ENV__[key];
      if (windowValue) return windowValue;
    }
  } catch {
    // window unavailable (SSR)
  }

  return '';
}

export const env = {
  SUPABASE_URL: getEnv('SUPABASE_URL'),
  SUPABASE_ANON_KEY: getEnv('SUPABASE_ANON_KEY'),
  GITHUB_TOKEN: getEnv('GITHUB_TOKEN'),
  GOOGLE_MAPS_API_KEY: getEnv('GOOGLE_MAPS_API_KEY'),
  GEMINI_API_KEY: getEnv('GEMINI_API_KEY'),
  YOUTUBE_API_KEY: getEnv('YOUTUBE_API_KEY'),
  STRIPE_PUBLISHABLE_KEY: getEnv('STRIPE_PUBLISHABLE_KEY'),
  OWNER_PRICE_MONTHLY: getEnv('OWNER_PRICE_MONTHLY'),
  OWNER_PRICE_ANNUAL: getEnv('OWNER_PRICE_ANNUAL'),
  FLEET_PRICE_MONTHLY: getEnv('FLEET_PRICE_MONTHLY'),
  FLEET_PRICE_ANNUAL: getEnv('FLEET_PRICE_ANNUAL'),
  APP_URL: getEnv('APP_URL'),
};

export const isDevelopment = () => {
  try {
    return import.meta.env?.DEV === true || import.meta.env?.MODE === 'development';
  } catch {
    return typeof window !== 'undefined' && window.location.hostname === 'localhost';
  }
};

export const isProduction = () => {
  try {
    return import.meta.env?.PROD === true;
  } catch {
    return false;
  }
};

export default env;
