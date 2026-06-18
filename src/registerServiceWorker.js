import { Capacitor } from '@capacitor/core';

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  if (import.meta.env.DEV) return;
  if (Capacitor.isNativePlatform()) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Keep startup resilient if SW registration fails.
    });
  });
}
