// Simple and safe environment variable handling for Vite
// Fixes typeof import and syntax error issues
// Enhanced with security validation and token management

import { 
  validateAllEnvironmentVariables, 
  SecureTokenStorage,
  type TokenValidationResult 
} from './token-security';

// Fallback values for development
const FALLBACK_VALUES = {
  GOOGLE_MAPS_API_KEY: '', // No API key - will use fallback map
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: '',
  GITHUB_TOKEN: ''
};

// Security validation results
let validationResults: {
  isValid: boolean;
  results: Record<string, TokenValidationResult>;
  criticalErrors: string[];
  allWarnings: string[];
} | null = null;

// Safe environment variable getter with security validation
function getEnv(key: string): string {
  let value = '';
  
  try {
    // Check import.meta.env (Vite)
    if (import.meta?.env) {
      const viteValue = import.meta.env[`VITE_${key}`] || import.meta.env[key];
      if (viteValue) value = viteValue;
    }
  } catch (error) {
    // Ignore import.meta errors
  }

  try {
    // Check window.__ENV__ (runtime)
    if (typeof window !== 'undefined' && (window as any).__ENV__) {
      const windowValue = (window as any).__ENV__[key];
      if (windowValue && !value) value = windowValue;
    }
  } catch (error) {
    // Ignore window errors
  }

  // Check secure token storage for sensitive keys
  if (!value && typeof window !== 'undefined') {
    const secureValue = SecureTokenStorage.retrieve(key);
    if (secureValue) {
      value = secureValue;
    }
  }

  // Return fallback value if nothing found
  if (!value) {
    value = (FALLBACK_VALUES as any)[key] || '';
  }

  return value;
}

// Export environment variables with validation
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

// Validate environment variables on load
function performSecurityValidation() {
  validationResults = validateAllEnvironmentVariables(env);
  
  // Log security validation results in development
  if (isDevelopment()) {
    if (!validationResults.isValid) {
      console.group('🔒 Environment Security Validation Failed');
      console.warn('Critical errors found:', validationResults.criticalErrors);
      if (validationResults.allWarnings.length > 0) {
        console.warn('Warnings:', validationResults.allWarnings);
      }
      console.groupEnd();
    } else {
      console.log('🔒 Environment security validation passed');
      if (validationResults.allWarnings.length > 0) {
        console.warn('Security warnings:', validationResults.allWarnings);
      }
    }
  }
  
  // Clean up expired tokens
  if (typeof window !== 'undefined') {
    SecureTokenStorage.cleanup();
  }
}

// Perform validation
performSecurityValidation();

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

// Helper functions to access validation results
export function getEnvironmentValidation() {
  return validationResults;
}

export function isEnvironmentSecure(): boolean {
  return validationResults?.isValid ?? false;
}

export function getSecurityWarnings(): string[] {
  return validationResults?.allWarnings ?? [];
}

export function getCriticalSecurityErrors(): string[] {
  return validationResults?.criticalErrors ?? [];
}

// Function to securely store a token
export function storeSecureToken(key: string, token: string, expirationHours: number = 24): void {
  if (typeof window !== 'undefined') {
    SecureTokenStorage.store(key, token, expirationHours);
    // Re-validate after storing new token
    performSecurityValidation();
  }
}

// Function to remove a stored token
export function removeSecureToken(key: string): void {
  if (typeof window !== 'undefined') {
    SecureTokenStorage.remove(key);
    // Re-validate after removing token
    performSecurityValidation();
  }
}

export default env;