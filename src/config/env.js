/**
 * Environment configuration
 * Safe environment variable access with fallback chain
 */

const FALLBACK_VALUES = {
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: '',
  GITHUB_TOKEN: '',
  GOOGLE_MAPS_API_KEY: '',
  YOUTUBE_API_KEY: '',
};

function getEnv(key) {
  // 1. Vite env vars (VITE_ prefix)
  try {
    const viteValue = import.meta.env?.[`VITE_${key}`] || import.meta.env?.[key];
    if (viteValue) return viteValue;
  } catch (e) {
    // silent
  }

  // 2. Window.__ENV__ (runtime injection)
  try {
    if (typeof window !== 'undefined' && window.__ENV__) {
      const windowValue = window.__ENV__[key];
      if (windowValue) return windowValue;
    }
  } catch (e) {
    // silent
  }

  return FALLBACK_VALUES[key] || '';
}

export const env = {
  SUPABASE_URL: getEnv('SUPABASE_URL'),
  SUPABASE_ANON_KEY: getEnv('SUPABASE_ANON_KEY'),
  GITHUB_TOKEN: getEnv('GITHUB_TOKEN'),
  GOOGLE_MAPS_API_KEY: getEnv('GOOGLE_MAPS_API_KEY'),
  YOUTUBE_API_KEY: getEnv('YOUTUBE_API_KEY'),
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
