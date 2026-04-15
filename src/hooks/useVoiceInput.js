import { useState, useRef, useCallback, useEffect } from 'react';

const LANG_MAP = { en: 'en-US', ru: 'ru-RU', es: 'es-ES' };

export function useVoiceInput({ language = 'en', onResult } = {}) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  const SpeechRecognition =
    typeof window !== 'undefined'
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : null;

  const supported = !!SpeechRecognition;

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const start = useCallback(() => {
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = LANG_MAP[language] || 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript && onResult) onResult(transcript);
      setListening(false);
    };

    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, [SpeechRecognition, language, onResult]);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  useEffect(() => {
    return () => recognitionRef.current?.abort();
  }, []);

  return { listening, toggle, supported };
}
