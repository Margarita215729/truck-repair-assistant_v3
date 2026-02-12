import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { en, ru } from '@/i18n';

const STORAGE_KEY = 'truck_repair_language';
const LANGUAGES = { en, ru };
const LANGUAGE_LABELS = { en: 'English', ru: 'Русский' };

function getInitialLanguage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && LANGUAGES[stored]) return stored;
  } catch {}
  // Auto-detect from browser
  const browserLang = navigator.language?.slice(0, 2);
  return browserLang === 'ru' ? 'ru' : 'en';
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
    () => ({ language, setLanguage, t, languages: LANGUAGE_LABELS }),
    [language, setLanguage, t]
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
