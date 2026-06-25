/**
 * Open external URLs safely in browser and Capacitor WebView.
 * Falls back to same-window navigation when window.open is blocked.
 */

export function openExternalUrl(url) {
  if (!url || typeof url !== 'string') return false;

  try {
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    if (opened) {
      try {
        opened.opener = null;
      } catch {
        // ignore
      }
      return true;
    }
  } catch {
    // fall through
  }

  try {
    window.location.href = url;
    return true;
  } catch {
    return false;
  }
}
