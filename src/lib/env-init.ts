// Environment initialization for browser environment
// This ensures environment variables are available throughout the app

// Safely access import.meta.env with fallbacks
const getImportMetaEnv = () => {
  try {
    return typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {};
  } catch (error) {
    console.warn('import.meta.env not available:', error);
    return {};
  }
};

// Get environment variables from Vite's import.meta.env
const getEnvVar = (key: string): string => {
  const env = getImportMetaEnv();
  
  // Try multiple possible environment variable names for compatibility
  const viteKey = `VITE_${key}`;
  const reactKey = `REACT_APP_${key}`;
  
  const value = 
    env[viteKey] || 
    env[key] ||
    env[reactKey] ||
    (typeof window !== 'undefined' && (window as any).__ENV__?.[key]) ||
    (typeof process !== 'undefined' && process.env && process.env[viteKey]) ||
    (typeof process !== 'undefined' && process.env && process.env[key]);
    
  return value || '';
};

// Environment configuration with fallbacks and hardcoded development values
const ENV_CONFIG = {
  GOOGLE_MAPS_API_KEY: getEnvVar('GOOGLE_MAPS_API_KEY') || 'AIzaSyB4zVUOU8sLRE3WklXndoKOAutxSlstkyc',
  SUPABASE_URL: getEnvVar('SUPABASE_URL') || 'https://ckozllxnzgmxmxaqqhvi.supabase.co',
  SUPABASE_ANON_KEY: getEnvVar('SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrb3psbHhuemdteG14YXFxaHZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzOTY2MzcsImV4cCI6MjA3MDk3MjYzN30.XBVHQUDgUrSSOlL0nMk717mvx_I7mT5TjD_AdpgTFUo',
};

export const initEnv = (): void => {
  try {
    if (typeof window !== 'undefined') {
      // Initialize window.__ENV__ if it doesn't exist
      if (!(window as any).__ENV__) {
        (window as any).__ENV__ = {};
      }
      
      // Set environment variables
      Object.assign((window as any).__ENV__, ENV_CONFIG);
      
      // Debug info (only show in development)
      const env = getImportMetaEnv();
      const isDev = env.DEV || env.MODE === 'development' || !env.PROD;
      
      if (isDev) {
        console.info('🔧 Environment variables initialized:', {
          GOOGLE_MAPS_API_KEY: ENV_CONFIG.GOOGLE_MAPS_API_KEY ? '✅ Set' : '❌ Missing',
          SUPABASE_URL: ENV_CONFIG.SUPABASE_URL ? '✅ Set' : '❌ Missing',
          SUPABASE_ANON_KEY: ENV_CONFIG.SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing',
        });
        console.info('🌍 Environment mode:', env.MODE || 'unknown');
      }
    }
  } catch (error) {
    console.warn('Failed to initialize environment variables:', error);
    
    // Fallback: still set the config even if there's an error
    if (typeof window !== 'undefined') {
      try {
        (window as any).__ENV__ = ENV_CONFIG;
      } catch (fallbackError) {
        console.error('Fallback environment initialization failed:', fallbackError);
      }
    }
  }
};

// Export helper to get environment variables
export const getEnvironmentVariable = (key: string): string => {
  try {
    return getEnvVar(key);
  } catch (error) {
    console.warn(`Failed to get environment variable ${key}:`, error);
    return '';
  }
};