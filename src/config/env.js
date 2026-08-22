/**
 * Environment configuration
 * Reads an explicit allowlist of public client variables from Vite or window.__ENV__.
 * Returns empty string for unconfigured optional vars — services must check
 * and throw their own errors for required configuration.
 */

const PUBLIC_ENV_ALIASES = {
  SUPABASE_URL: [
    'VITE_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_STORAGE_SUPABASE_SUPABASE_URL',
  ],
  SUPABASE_PUBLISHABLE_KEY: [
    'VITE_SUPABASE_PUBLISHABLE_KEY',
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    'NEXT_PUBLIC_STORAGE_SUPABASE_SUPABASE_PUBLISHABLE_KEY',
  ],
  NEXT_PUBLIC_BASE_URL: [
    'NEXT_PUBLIC_BASE_URL',
    'VITE_APP_URL',
  ],
  GOOGLE_MAPS_API_KEY: [
    'VITE_GOOGLE_MAPS_API_KEY',
    'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY',
  ],
  YOUTUBE_API_KEY: [
    'VITE_YOUTUBE_API_KEY',
    'NEXT_PUBLIC_YOUTUBE_API_KEY',
  ],
  STRIPE_PUBLISHABLE_KEY: [
    'VITE_STRIPE_PUBLISHABLE_KEY',
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  ],
  PREMIUM_PRICE_MONTHLY: [
    'VITE_PREMIUM_PRICE_MONTHLY',
    'NEXT_PUBLIC_PREMIUM_PRICE_MONTHLY',
  ],
};

function readPublicEnvValue(key) {
  // 1. Vite only exposes variables allowed by vite.config.js envPrefix.
  try {
    const value = import.meta.env?.[key];
    if (value) return value;
  } catch {
    // import.meta.env unavailable (SSR/test)
  }

  // 2. Runtime injection is also restricted to the explicit allowlist above.
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

function getPublicEnv(key) {
  const candidates = PUBLIC_ENV_ALIASES[key] || [];
  for (const candidate of candidates) {
    const value = readPublicEnvValue(candidate);
    if (value) return value;
  }
  return '';
}

const supabaseUrl = getPublicEnv('SUPABASE_URL');
const supabasePublishableKey = getPublicEnv('SUPABASE_PUBLISHABLE_KEY');
const baseUrl = getPublicEnv('NEXT_PUBLIC_BASE_URL');

export const env = Object.freeze({
  SUPABASE_URL: supabaseUrl,
  SUPABASE_PUBLISHABLE_KEY: supabasePublishableKey,
  NEXT_PUBLIC_BASE_URL: baseUrl,
  APP_URL: baseUrl,
  GOOGLE_MAPS_API_KEY: getPublicEnv('GOOGLE_MAPS_API_KEY'),
  YOUTUBE_API_KEY: getPublicEnv('YOUTUBE_API_KEY'),
  STRIPE_PUBLISHABLE_KEY: getPublicEnv('STRIPE_PUBLISHABLE_KEY'),
  PREMIUM_PRICE_MONTHLY: getPublicEnv('PREMIUM_PRICE_MONTHLY'),
});

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
