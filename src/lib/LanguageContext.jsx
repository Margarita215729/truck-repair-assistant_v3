import React, { createContext, useContext, useState, useCallback } from 'react';
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

  const t = useCallback((key) => {
    const value = getNestedValue(LANGUAGES[language], key);
    if (value !== undefined) return value;
    // Fallback to English
    const fallback = getNestedValue(LANGUAGES.en, key);
    if (fallback !== undefined) return fallback;
    // Return key as last resort
    return key;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, languages: LANGUAGE_LABELS }}>
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
