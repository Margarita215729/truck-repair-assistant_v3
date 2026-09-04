import { createClient } from '@supabase/supabase-js';
import { applyCors } from './lib/cors.js';
import {
  GUEST_DAILY_LIMIT,
  GUEST_ID_HEADER,
  createGuestQuotaKeys,
  isValidGuestId,
  releaseGuestRequest,
  releaseUserRequest,
  reserveGuestRequest,
  reserveUserRequest,
} from './lib/guestQuota.js';

const GEMINI_OPENAI_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
const DEFAULT_MODEL = 'gemini-2.5-flash';
const MAX_MESSAGES = 50;
const MAX_TOKENS_LIMIT = 16384;
const MAX_GUEST_TOKENS = 8192;
const MAX_REQUEST_CHARS = 120_000;
const FREE_DAILY_LIMIT = 10;

export const config = {
  api: { bodyParser: { sizeLimit: '1mb' } },
};

let _supabase;
function getServerConfig() {
  const url = process.env.NEXT_PUBLIC_STORAGE_SUPABASE_SUPABASE_URL;
  const key = process.env.STORAGE_SUPABASE_SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_STORAGE_SUPABASE_SUPABASE_URL and STORAGE_SUPABASE_SUPABASE_SECRET_KEY must be set in environment variables');
  }
  return { url, key };
}

function getSupabase() {
  if (!_supabase) {
    const { url, key } = getServerConfig();
    _supabase = createClient(url, key);
  }
  return _supabase;
}

function payloadSize(messages) {
  try { return JSON.stringify(messages).length; } catch { return Number.POSITIVE_INFINITY; }
}

async function releaseReservation(reservation) {
  if (!reservation) return;
  try {
    if (reservation.kind === 'guest') {
      await releaseGuestRequest(getSupabase(), reservation.keys);
    } else if (reservation.kind === 'user') {
      await releaseUserRequest(getSupabase(), reservation.userId);
    }
  } catch (error) {
    console.warn('Failed to release AI quota reservation:', error?.message || error);
  }
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Cache-Control', 'no-store');
  let reservation = null;

  try {
    const authHeader = req.headers.authorization || '';
    const guestId = req.headers[GUEST_ID_HEADER];
    let user = null;
    let guestKeys = null;

    if (authHeader) {
      if (!authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Invalid authorization scheme' });
      }
      const token = authHeader.slice('Bearer '.length).trim();
      const { data: { user: authenticatedUser }, error: authError } = await getSupabase().auth.getUser(token);
      if (authError || !authenticatedUser) {
        return res.status(401).json({ error: 'Invalid token' });
      }
      user = authenticatedUser;
    } else if (isValidGuestId(guestId)) {
      const { key } = getServerConfig();
      guestKeys = createGuestQuotaKeys(req, guestId, key);
    } else {
      return res.status(401).json({
        error: 'Authentication or guest identifier required',
        code: 'GUEST_ID_REQUIRED',
      });
    }

    const { messages, temperature, max_tokens, response_format } = req.body || {};

    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: 'Missing messages array' });
    }
    if (messages.length === 0 || messages.length > MAX_MESSAGES) {
      return res.status(400).json({ error: `Messages must contain 1-${MAX_MESSAGES} items` });
    }
    if (payloadSize(messages) > MAX_REQUEST_CHARS) {
      return res.status(413).json({ error: 'Diagnostic request is too large' });
    }

    const allowedRoles = new Set(['system', 'user', 'assistant']);
    const sanitizedMessages = messages
      .filter(message => message && typeof message === 'object'
        && allowedRoles.has(message.role) && message.content != null)
      .map(message => ({ role: message.role, content: message.content }));

    if (sanitizedMessages.length === 0) {
      return res.status(400).json({ error: 'No valid messages after sanitization' });
    }

    const allowedResponseFormats = new Set(['json_object', 'text']);
    const safeResponseFormat = response_format
      && allowedResponseFormats.has(response_format?.type)
      ? { type: response_format.type }
      : undefined;

    const requestedTokens = Number(max_tokens);
    const tokenCeiling = user ? MAX_TOKENS_LIMIT : MAX_GUEST_TOKENS;
    const safeMaxTokens = Math.min(
      Number.isFinite(requestedTokens) && requestedTokens > 0 ? requestedTokens : 4000,
      tokenCeiling,
    );
    const requestedTemperature = Number(temperature);
    const safeTemperature = Number.isFinite(requestedTemperature)
      ? Math.max(0, Math.min(requestedTemperature, 2))
      : 0.3;

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      console.error('GEMINI_API_KEY environment variable is not set');
      return res.status(500).json({ error: 'Diagnostic service not configured' });
    }

    let quota;
    if (user) {
      const { data: subscription, error: subscriptionError } = await getSupabase()
        .from('subscriptions')
        .select('plan, status')
        .eq('user_id', user.id)
        .maybeSingle();

      if (subscriptionError) {
        console.error('Subscription lookup failed:', subscriptionError.message);
        return res.status(503).json({ error: 'Usage service temporarily unavailable' });
      }

      const isPro = subscription
        && ['premium', 'pro', 'lifetime', 'owner', 'fleet'].includes(subscription.plan)
        && ['active', 'trialing'].includes(subscription.status);

      if (!isPro) {
        try {
          quota = await reserveUserRequest(getSupabase(), user.id);
        } catch (error) {
          console.error('User quota reservation failed:', error.message);
          return res.status(503).json({ error: 'Usage service temporarily unavailable' });
        }
        if (!quota.allowed) {
          return res.status(429).json({ error: 'Daily request limit reached', limit: quota });
        }
        reservation = { kind: 'user', userId: user.id };
      }
    } else {
      try {
        quota = await reserveGuestRequest(getSupabase(), guestKeys);
      } catch (error) {
        console.error('Guest quota reservation failed:', error.message);
        return res.status(503).json({ error: 'Guest usage service temporarily unavailable' });
      }
      if (!quota.allowed) {
        return res.status(429).json({ error: 'Daily request limit reached', limit: quota });
      }
      reservation = { kind: 'guest', keys: guestKeys };
    }

    let response;
    try {
      response = await fetch(GEMINI_OPENAI_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${geminiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: sanitizedMessages,
          // Legacy clients may still send GitHub model names. The server owns
          // provider selection so old web/mobile bundles continue to work.
          model: process.env.GEMINI_TEXT_MODEL || DEFAULT_MODEL,
          temperature: safeTemperature,
          max_tokens: safeMaxTokens,
          ...(safeResponseFormat ? { response_format: safeResponseFormat } : {}),
        }),
      });
    } catch (error) {
      await releaseReservation(reservation);
      reservation = null;
      console.error('Gemini request failed:', error?.message || error);
      return res.status(502).json({ error: 'Diagnostic service temporarily unavailable' });
    }

    if (!response.ok) {
      await releaseReservation(reservation);
      reservation = null;

      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText.slice(0, 500));

      let detail = 'Diagnostic service temporarily unavailable';
      try {
        const errorObject = JSON.parse(errorText);
        const message = errorObject?.error?.message || errorObject?.message || '';
        if (response.status === 401 || response.status === 403) {
          detail = 'Gemini API key is invalid or lacks Generative Language API access.';
        } else if (response.status === 404) {
          detail = 'Configured Gemini model is unavailable.';
        } else if (response.status === 429) {
          detail = 'Diagnostic service rate limit exceeded. Please try again in a moment.';
        } else if (message) {
          detail = message.slice(0, 200);
        }
      } catch { /* upstream body was not JSON */ }

      return res.status(502).json({ error: detail, upstream_status: response.status });
    }

    let data;
    try {
      data = await response.json();
    } catch {
      await releaseReservation(reservation);
      reservation = null;
      return res.status(502).json({ error: 'Diagnostic service returned an invalid response' });
    }

    if (!data?.choices?.[0]?.message?.content) {
      await releaseReservation(reservation);
      reservation = null;
      return res.status(502).json({ error: 'Diagnostic service returned an empty response' });
    }

    // The reservation becomes a consumed request only after a usable response.
    reservation = null;
    if (quota) data.limit = quota;
    return res.status(200).json(data);
  } catch (error) {
    await releaseReservation(reservation);
    console.error('Diagnostic proxy error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export { FREE_DAILY_LIMIT, GUEST_DAILY_LIMIT };
