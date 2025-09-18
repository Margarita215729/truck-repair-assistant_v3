// Simple and safe environment variable handling for Vite
// Fixes typeof import and syntax error issues

// Fallback values for development
const FALLBACK_VALUES = {
  GOOGLE_MAPS_API_KEY: '', // No API key - will use fallback map
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: '',
  GITHUB_TOKEN: ''
};

// Safe environment variable getter
function getEnv(key: string): string {
  try {
    // Check import.meta.env (Vite)
    if (import.meta?.env) {
      const viteValue = import.meta.env[`VITE_${key}`] || import.meta.env[key];
      if (viteValue) return viteValue;
    }
  } catch (error) {
    // Ignore import.meta errors
  }

  try {
    // Check window.__ENV__ (runtime)
    if (typeof window !== 'undefined' && (window as any).__ENV__) {
      const windowValue = (window as any).__ENV__[key];
      if (windowValue) return windowValue;
    }
  } catch (error) {
    // Ignore window errors
  }

  // Return fallback value
  return (FALLBACK_VALUES as any)[key] || '';
}

// Export environment variables
export const GOOGLE_MAPS_API_KEY = getEnv('GOOGLE_MAPS_API_KEY');
export const SUPABASE_URL = getEnv('SUPABASE_URL');
export const SUPABASE_ANON_KEY = getEnv('SUPABASE_ANON_KEY');
export const GITHUB_TOKEN = getEnv('GITHUB_TOKEN');

// Export object with all variables
export const env = {
  GOOGLE_MAPS_API_KEY,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  GITHUB_TOKEN
};

// Helper functions
export const isDevelopment = (): boolean => {
  try {
    return import.meta?.env?.DEV === true || import.meta?.env?.MODE === 'development';
  } catch {
    return true;
  }
};

export const isProduction = (): boolean => {
  try {
    return import.meta?.env?.PROD === true || import.meta?.env?.MODE === 'production';
  } catch {
    return false;
  }
};

// Initialize window.__ENV__
if (typeof window !== 'undefined') {
  (window as any).__ENV__ = env;
}

export default env;