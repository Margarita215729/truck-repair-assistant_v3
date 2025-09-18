// Простая и безопасная обработка переменных окружения для Vite
// Исправляет проблемы с typeof import и синтаксическими ошибками

// Развернутые значения для разработки (fallback)
const FALLBACK_VALUES = {
  GOOGLE_MAPS_API_KEY: '', // No API key - will use fallback map
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: '',
  GITHUB_TOKEN: ''
};

// Безопасный геттер переменных окружения
function getEnv(key: string): string {
  try {
    // Проверяем import.meta.env (Vite)
    if (import.meta?.env) {
      const viteValue = import.meta.env[`VITE_${key}`] || import.meta.env[key];
      if (viteValue) return viteValue;
    }
  } catch (error) {
    // Игнорируем ошибки import.meta
  }

  try {
    // Проверяем window.__ENV__ (runtime)
    if (typeof window !== 'undefined' && (window as any).__ENV__) {
      const windowValue = (window as any).__ENV__[key];
      if (windowValue) return windowValue;
    }
  } catch (error) {
    // Игнорируем ошибки window
  }

  // Возвращаем fallback значение
  return (FALLBACK_VALUES as any)[key] || '';
}

// Экспорт переменных окружения
export const GOOGLE_MAPS_API_KEY = getEnv('GOOGLE_MAPS_API_KEY');
export const SUPABASE_URL = getEnv('SUPABASE_URL');
export const SUPABASE_ANON_KEY = getEnv('SUPABASE_ANON_KEY');
export const GITHUB_TOKEN = getEnv('GITHUB_TOKEN');

// Экспорт объекта со всеми переменными
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

// Инициализация window.__ENV__
if (typeof window !== 'undefined') {
  (window as any).__ENV__ = env;
}

export default env;