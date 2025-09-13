import { useEffect, useState } from 'react';
import { env } from '../lib/safe-env';

// Простая валидация для безопасного файла
const validateEnvironment = () => {
  const missing: string[] = [];
  
  if (!env.GOOGLE_MAPS_API_KEY) missing.push('GOOGLE_MAPS_API_KEY');
  if (!env.SUPABASE_URL) missing.push('SUPABASE_URL');
  if (!env.SUPABASE_ANON_KEY) missing.push('SUPABASE_ANON_KEY');
  
  return {
    isValid: missing.length === 0,
    missing
  };
};

// Hook for accessing environment variables safely in React components
export function useEnvironment() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [validation, setValidation] = useState({ isValid: false, missing: [] as string[] });

  useEffect(() => {
    // Validate environment variables
    const result = validateEnvironment();
    setValidation(result);
    setIsLoaded(true);
    
    // Log validation results in development
    if (!result.isValid) {
      console.warn('Environment validation failed:', result.missing);
    }
  }, []);

  return {
    env,
    isLoaded,
    validation,
    isValid: validation.isValid
  };
}

// Specific hooks for individual environment variables
export function useGoogleMapsApiKey(): string {
  return env.GOOGLE_MAPS_API_KEY;
}

export function useSupabaseConfig(): { url: string; anonKey: string } {
  return {
    url: env.SUPABASE_URL,
    anonKey: env.SUPABASE_ANON_KEY
  };
}

export function useGithubToken(): string | undefined {
  return env.GITHUB_TOKEN;
}