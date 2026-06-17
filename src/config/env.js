/**
 * Environment configuration
 * Reads env vars from Vite (VITE_/NEXT_PUBLIC_ prefix) or window.__ENV__ (runtime injection).
 * Returns empty string for unconfigured optional vars — services must check
 * and throw their own errors for required configuration.
 */

// Known env var keys (not fallback values — just the list of supported keys)
const KNOWN_KEYS = [
  'NEXT_PUBLIC_STORAGE_SUPABASE_SUPABASE_URL',
  'STORAGE_SUPABASE_SUPABASE_ANON_KEY',
  'STORAGE_SUPABASE_SUPABASE_PUBLISHABLE_KEY',
  'STORAGE_SUPABASE_SUPABASE_SERVICE_ROLE_KEY',
  'STORAGE_SUPABASE_SUPABASE_SECRET_KEY',
  'STORAGE_SUPABASE_SUPABASE_JWT_SECRET',
  'GITHUB_TOKEN',
  'GOOGLE_MAPS_API_KEY', 'GEMINI_API_KEY', 'YOUTUBE_API_KEY',
  'STRIPE_PUBLISHABLE_KEY', 'PREMIUM_PRICE_MONTHLY', 'APP_URL',
];

function getEnv(key) {
  // 1. Vite env vars (direct key or VITE_ prefix)
  try {
    const directValue = import.meta.env?.[key];
    if (directValue) return directValue;

    const viteValue = import.meta.env?.[`VITE_${key}`];
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
  NEXT_PUBLIC_STORAGE_SUPABASE_SUPABASE_URL: getEnv('NEXT_PUBLIC_STORAGE_SUPABASE_SUPABASE_URL'),
  STORAGE_SUPABASE_SUPABASE_ANON_KEY: getEnv('STORAGE_SUPABASE_SUPABASE_ANON_KEY'),
  STORAGE_SUPABASE_SUPABASE_PUBLISHABLE_KEY: getEnv('STORAGE_SUPABASE_SUPABASE_PUBLISHABLE_KEY'),
  STORAGE_SUPABASE_SUPABASE_SERVICE_ROLE_KEY: getEnv('STORAGE_SUPABASE_SUPABASE_SERVICE_ROLE_KEY'),
  STORAGE_SUPABASE_SUPABASE_SECRET_KEY: getEnv('STORAGE_SUPABASE_SUPABASE_SECRET_KEY'),
  STORAGE_SUPABASE_SUPABASE_JWT_SECRET: getEnv('STORAGE_SUPABASE_SUPABASE_JWT_SECRET'),
  GITHUB_TOKEN: getEnv('GITHUB_TOKEN'),
  GOOGLE_MAPS_API_KEY: getEnv('GOOGLE_MAPS_API_KEY'),
  GEMINI_API_KEY: getEnv('GEMINI_API_KEY'),
  YOUTUBE_API_KEY: getEnv('YOUTUBE_API_KEY'),
  STRIPE_PUBLISHABLE_KEY: getEnv('STRIPE_PUBLISHABLE_KEY'),
  PREMIUM_PRICE_MONTHLY: getEnv('PREMIUM_PRICE_MONTHLY'),
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
