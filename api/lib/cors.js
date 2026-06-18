/**
 * Shared CORS helpers for web and Capacitor (iOS/Android) clients.
 * Native apps send Origin: capacitor://localhost — must be explicitly allowed.
 */

const NATIVE_APP_ORIGINS = [
  'capacitor://localhost',
  'ionic://localhost',
  'http://localhost',
  'https://localhost',
];

export function getAllowedOrigins() {
  return [
    'https://www.tra.tools',
    'https://tra.tools',
    'https://truck-repair-assistantv3-main.vercel.app',
    'https://truck-repair-assistant-v3.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000',
    process.env.NEXT_PUBLIC_BASE_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '',
    ...NATIVE_APP_ORIGINS,
  ].filter(Boolean);
}

export function resolveCorsOrigin(requestOrigin) {
  const origin = requestOrigin || '';
  return getAllowedOrigins().includes(origin) ? origin : '';
}

/**
 * Apply CORS response headers. Reflects the request origin when allowed.
 * @returns {boolean} true if the request was handled as an OPTIONS preflight
 */
export function applyCors(req, res) {
  const origin = req.headers.origin || '';
  const corsOrigin = resolveCorsOrigin(origin);

  if (corsOrigin) {
    res.setHeader('Access-Control-Allow-Origin', corsOrigin);
  }

  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Vary', 'Origin');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }

  return false;
}
