// Environment variables management for Truck Diagnostic AI
// This file provides a centralized way to access environment variables

// Re-export from safe-env to maintain compatibility
export { env, GOOGLE_MAPS_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY, GITHUB_TOKEN } from './safe-env';
import { env } from './safe-env';

// Type definitions for environment variables
interface EnvironmentConfig {
  GOOGLE_MAPS_API_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  GITHUB_TOKEN?: string;
}

// Helper function to check if we're in development mode
export const isDevelopment = (): boolean => {
  try {
    return import.meta?.env?.DEV === true || import.meta?.env?.MODE === 'development';
  } catch (error) {
    return true; // Default to development if we can't determine
  }
};

// Helper function to check if we're in production mode
export const isProduction = (): boolean => {
  try {
    return import.meta?.env?.PROD === true || import.meta?.env?.MODE === 'production';
  } catch (error) {
    return false;
  }
};

// Validation function to check if required environment variables are set
export const validateEnvironment = (): { isValid: boolean; missing: string[] } => {
  const requiredKeys: (keyof EnvironmentConfig)[] = [
    'GOOGLE_MAPS_API_KEY',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY'
  ];

  const missing: string[] = [];

  for (const key of requiredKeys) {
    if (!env[key]) {
      missing.push(key);
    }
  }

  return {
    isValid: missing.length === 0,
    missing
  };
};

// Default export for compatibility
export default env;