import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { en, ru, es } from '@/i18n';

const STORAGE_KEY = 'truck_repair_language';
const LANGUAGES = { en, ru, es };
const LANGUAGE_LABELS = { en: 'English', ru: 'Русский', es: 'Español' };
const LANGUAGE_ORDER = ['en', 'ru', 'es'];

function getInitialLanguage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && LANGUAGES[stored]) return stored;
  } catch {}
  // Auto-detect from browser
  const browserLang = navigator.language?.slice(0, 2);
  if (browserLang === 'ru') return 'ru';
  if (browserLang === 'es') return 'es';
  return 'en';
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(getInitialLanguage);

  const setLanguage = useCallback((lang) => {
    if (LANGUAGES[lang]) {
      setLanguageState(lang);
      try { localStorage.setItem(STORAGE_KEY, lang); } catch {}
    }
  }, []);

  const getNextLanguage = useCallback(() => {
    const idx = LANGUAGE_ORDER.indexOf(language);
    const nextIdx = idx === -1 ? 0 : (idx + 1) % LANGUAGE_ORDER.length;
    return LANGUAGE_ORDER[nextIdx];
  }, [language]);

  const t = useCallback((key, params) => {
    let value = getNestedValue(LANGUAGES[language], key);
    if (value === undefined) {
      // Fallback to English
      value = getNestedValue(LANGUAGES.en, key);
    }
    if (value === undefined) return key; // Return key as last resort
    // Support interpolation: t('key', { name }) replaces {name} in string
    if (params && typeof value === 'string') {
      for (const [param, replacement] of Object.entries(params)) {
        value = value.replace(new RegExp(`\\{${param}\\}`, 'g'), String(replacement ?? ''));
      }
    }
    return value;
  }, [language]);

  const contextValue = useMemo(
    () => ({ language, setLanguage, getNextLanguage, t, languages: LANGUAGE_LABELS }),
    [language, setLanguage, getNextLanguage, t]
  );

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
