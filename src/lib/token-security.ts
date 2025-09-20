/**
 * Token Security Module
 * Provides secure token handling, validation, and encryption
 */

// Simple encryption key for demo - in production use proper key management
const ENCRYPTION_KEY = 'truck-diagnostic-secure-key-2024';

export interface TokenValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface SecureToken {
  value: string;
  encrypted: string;
  expiresAt: number;
  createdAt: number;
  isExpired: boolean;
}

/**
 * Validates GitHub token format and security
 */
export function validateGitHubToken(token: string): TokenValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!token || token.trim().length === 0) {
    errors.push('Token is required');
    return { isValid: false, errors, warnings };
  }

  const trimmedToken = token.trim();

  // Check minimum length
  if (trimmedToken.length < 40) {
    errors.push('GitHub token must be at least 40 characters long');
  }

  // Check token format - GitHub tokens start with specific prefixes
  const validPrefixes = ['ghp_', 'github_pat_', 'gho_', 'ghu_', 'ghs_', 'ghr_'];
  const hasValidPrefix = validPrefixes.some(prefix => trimmedToken.startsWith(prefix));
  
  if (!hasValidPrefix) {
    warnings.push('Token format may be invalid. GitHub tokens typically start with: ' + validPrefixes.join(', '));
  }

  // Check for suspicious patterns
  if (/^[a-zA-Z0-9_]+$/.test(trimmedToken) === false) {
    errors.push('Token contains invalid characters');
  }

  // Check if token looks like a test or placeholder value
  const suspiciousPatterns = [
    'test', 'demo', 'example', 'placeholder', 'your_token', 'api_key', 
    '123456', 'abcdef', 'sample', 'dummy'
  ];
  
  const lowerToken = trimmedToken.toLowerCase();
  const isSuspicious = suspiciousPatterns.some(pattern => lowerToken.includes(pattern));
  
  if (isSuspicious) {
    warnings.push('Token appears to be a placeholder or test value');
  }

  // Check for repeated patterns that might indicate fake tokens
  const hasRepeatedChars = /(.)\1{10,}/.test(trimmedToken);
  if (hasRepeatedChars) {
    warnings.push('Token contains suspicious repeated characters');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validates Google Maps API key format
 */
export function validateGoogleMapsKey(key: string): TokenValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!key || key.trim().length === 0) {
    errors.push('Google Maps API key is required');
    return { isValid: false, errors, warnings };
  }

  const trimmedKey = key.trim();

  // Google Maps API keys are typically 39 characters
  if (trimmedKey.length !== 39) {
    warnings.push('Google Maps API key should be 39 characters long');
  }

  // Check if it starts with AIza (typical for Google API keys)
  if (!trimmedKey.startsWith('AIza')) {
    warnings.push('Google Maps API key typically starts with "AIza"');
  }

  // Check for valid characters (alphanumeric, underscore, hyphen)
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmedKey)) {
    errors.push('API key contains invalid characters');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validates Supabase keys
 */
export function validateSupabaseKey(key: string, keyType: 'url' | 'anon'): TokenValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!key || key.trim().length === 0) {
    errors.push(`Supabase ${keyType} key is required`);
    return { isValid: false, errors, warnings };
  }

  const trimmedKey = key.trim();

  if (keyType === 'url') {
    // Validate URL format
    try {
      const url = new URL(trimmedKey);
      if (!url.hostname.includes('supabase')) {
        warnings.push('URL does not appear to be a Supabase URL');
      }
      if (url.protocol !== 'https:') {
        errors.push('Supabase URL must use HTTPS');
      }
    } catch {
      errors.push('Invalid URL format');
    }
  } else if (keyType === 'anon') {
    // Supabase anon keys are JWT tokens
    if (!trimmedKey.startsWith('eyJ')) {
      warnings.push('Supabase anon key should start with "eyJ" (JWT format)');
    }
    
    // Check for dots (JWT structure)
    const parts = trimmedKey.split('.');
    if (parts.length !== 3) {
      errors.push('Supabase anon key should have 3 parts separated by dots (JWT format)');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Simple encryption for token storage (for demo purposes)
 * In production, use proper encryption libraries like crypto-js or Web Crypto API
 */
export function encryptToken(token: string): string {
  if (!token) return '';
  
  try {
    // Simple XOR encryption for demo - NOT secure for production
    let encrypted = '';
    for (let i = 0; i < token.length; i++) {
      const keyChar = ENCRYPTION_KEY[i % ENCRYPTION_KEY.length];
      encrypted += String.fromCharCode(token.charCodeAt(i) ^ keyChar.charCodeAt(0));
    }
    return btoa(encrypted); // Base64 encode
  } catch (error) {
    console.warn('Token encryption failed:', error);
    return token; // Fallback to plain token
  }
}

/**
 * Simple decryption for token retrieval
 */
export function decryptToken(encryptedToken: string): string {
  if (!encryptedToken) return '';
  
  try {
    const encrypted = atob(encryptedToken); // Base64 decode
    let decrypted = '';
    for (let i = 0; i < encrypted.length; i++) {
      const keyChar = ENCRYPTION_KEY[i % ENCRYPTION_KEY.length];
      decrypted += String.fromCharCode(encrypted.charCodeAt(i) ^ keyChar.charCodeAt(0));
    }
    return decrypted;
  } catch (error) {
    console.warn('Token decryption failed:', error);
    return encryptedToken; // Fallback to original
  }
}

/**
 * Creates a secure token object with expiration
 */
export function createSecureToken(token: string, expirationHours: number = 24): SecureToken {
  const now = Date.now();
  const expiresAt = now + (expirationHours * 60 * 60 * 1000);
  
  return {
    value: token,
    encrypted: encryptToken(token),
    expiresAt,
    createdAt: now,
    isExpired: false
  };
}

/**
 * Checks if a token is expired
 */
export function isTokenExpired(secureToken: SecureToken): boolean {
  return Date.now() > secureToken.expiresAt;
}

/**
 * Gets a token with expiration check
 */
export function getSecureToken(secureToken: SecureToken): string | null {
  if (isTokenExpired(secureToken)) {
    return null;
  }
  return decryptToken(secureToken.encrypted);
}

/**
 * Validates all environment variables comprehensively
 */
export function validateAllEnvironmentVariables(env: {
  GOOGLE_MAPS_API_KEY?: string;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  GITHUB_TOKEN?: string;
}): {
  isValid: boolean;
  results: Record<string, TokenValidationResult>;
  criticalErrors: string[];
  allWarnings: string[];
} {
  const results: Record<string, TokenValidationResult> = {};
  const criticalErrors: string[] = [];
  const allWarnings: string[] = [];

  // Validate Google Maps API Key
  if (env.GOOGLE_MAPS_API_KEY) {
    results.GOOGLE_MAPS_API_KEY = validateGoogleMapsKey(env.GOOGLE_MAPS_API_KEY);
    if (!results.GOOGLE_MAPS_API_KEY.isValid) {
      criticalErrors.push(...results.GOOGLE_MAPS_API_KEY.errors);
    }
    allWarnings.push(...results.GOOGLE_MAPS_API_KEY.warnings);
  } else {
    results.GOOGLE_MAPS_API_KEY = { isValid: false, errors: ['Google Maps API key is missing'], warnings: [] };
    criticalErrors.push('Google Maps API key is missing');
  }

  // Validate Supabase URL
  if (env.SUPABASE_URL) {
    results.SUPABASE_URL = validateSupabaseKey(env.SUPABASE_URL, 'url');
    if (!results.SUPABASE_URL.isValid) {
      criticalErrors.push(...results.SUPABASE_URL.errors);
    }
    allWarnings.push(...results.SUPABASE_URL.warnings);
  } else {
    results.SUPABASE_URL = { isValid: false, errors: ['Supabase URL is missing'], warnings: [] };
    criticalErrors.push('Supabase URL is missing');
  }

  // Validate Supabase Anon Key
  if (env.SUPABASE_ANON_KEY) {
    results.SUPABASE_ANON_KEY = validateSupabaseKey(env.SUPABASE_ANON_KEY, 'anon');
    if (!results.SUPABASE_ANON_KEY.isValid) {
      criticalErrors.push(...results.SUPABASE_ANON_KEY.errors);
    }
    allWarnings.push(...results.SUPABASE_ANON_KEY.warnings);
  } else {
    results.SUPABASE_ANON_KEY = { isValid: false, errors: ['Supabase anon key is missing'], warnings: [] };
    criticalErrors.push('Supabase anon key is missing');
  }

  // Validate GitHub Token (optional)
  if (env.GITHUB_TOKEN) {
    results.GITHUB_TOKEN = validateGitHubToken(env.GITHUB_TOKEN);
    // GitHub token is optional, so don't add to critical errors
    allWarnings.push(...results.GITHUB_TOKEN.warnings);
    if (!results.GITHUB_TOKEN.isValid) {
      allWarnings.push(...results.GITHUB_TOKEN.errors);
    }
  }

  return {
    isValid: criticalErrors.length === 0,
    results,
    criticalErrors,
    allWarnings
  };
}

/**
 * Secure token storage in localStorage with encryption
 */
export class SecureTokenStorage {
  private static PREFIX = 'secure_token_';

  static store(key: string, token: string, expirationHours: number = 24): void {
    try {
      const secureToken = createSecureToken(token, expirationHours);
      localStorage.setItem(
        this.PREFIX + key, 
        JSON.stringify(secureToken)
      );
    } catch (error) {
      console.warn('Failed to store secure token:', error);
    }
  }

  static retrieve(key: string): string | null {
    try {
      const stored = localStorage.getItem(this.PREFIX + key);
      if (!stored) return null;

      const secureToken: SecureToken = JSON.parse(stored);
      return getSecureToken(secureToken);
    } catch (error) {
      console.warn('Failed to retrieve secure token:', error);
      return null;
    }
  }

  static remove(key: string): void {
    try {
      localStorage.removeItem(this.PREFIX + key);
    } catch (error) {
      console.warn('Failed to remove secure token:', error);
    }
  }

  static isExpired(key: string): boolean {
    try {
      const stored = localStorage.getItem(this.PREFIX + key);
      if (!stored) return true;

      const secureToken: SecureToken = JSON.parse(stored);
      return isTokenExpired(secureToken);
    } catch {
      return true;
    }
  }

  static cleanup(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.PREFIX) && this.isExpired(key.replace(this.PREFIX, ''))) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Token cleanup failed:', error);
    }
  }
}