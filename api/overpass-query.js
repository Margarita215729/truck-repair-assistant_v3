/**
 * Overpass API proxy — truck parking, weigh stations, restrictions (OpenStreetMap).
 *
 * Capacitor WebViews cannot call overpass-api.de directly (no CORS for
 * capacitor://localhost). This route runs server-side and returns OSM elements.
 *
 * POST /api/overpass-query
 * Body: { query: string }
 * Returns: { elements: object[] }
 */

import { createClient } from '@supabase/supabase-js';
import { applyCors } from './lib/cors.js';

const OVERPASS_API = process.env.OVERPASS_API_URL || 'https://overpass-api.de/api/interpreter';
const MAX_QUERY_LENGTH = 12000;

let _supabase;
function getSupabase() {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_STORAGE_SUPABASE_SUPABASE_URL;
    const key = process.env.STORAGE_SUPABASE_SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error('NEXT_PUBLIC_STORAGE_SUPABASE_SUPABASE_URL and STORAGE_SUPABASE_SUPABASE_SERVICE_ROLE_KEY must be set');
    }
    _supabase = createClient(url, key);
  }
  return _supabase;
}

export function validateOverpassQuery(query) {
  if (!query || typeof query !== 'string') {
    return { ok: false, error: 'query is required and must be a string' };
  }
  if (query.length > MAX_QUERY_LENGTH) {
    return { ok: false, error: `query too long (max ${MAX_QUERY_LENGTH} characters)` };
  }

  const trimmed = query.trim();
  if (!trimmed.startsWith('[out:json')) {
    return { ok: false, error: 'query must start with [out:json' };
  }
  if (/>;/.test(trimmed)) {
    return { ok: false, error: 'unsupported Overpass construct' };
  }
  if (/\{\{/.test(trimmed)) {
    return { ok: false, error: 'unsupported Overpass template syntax' };
  }

  return { ok: true };
}

async function callOverpass(query) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 28000);

  try {
    const response = await fetch(OVERPASS_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
    });

    if (response.status === 429 || response.status === 504) {
      const err = new Error(`Overpass API ${response.status}`);
      err.status = response.status;
      throw err;
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Overpass API ${response.status}${text ? `: ${text.slice(0, 200)}` : ''}`);
    }

    const data = await response.json();
    return Array.isArray(data.elements) ? data.elements : [];
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { data: { user }, error: authError } = await getSupabase().auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const { query } = req.body || {};
  const validation = validateOverpassQuery(query);
  if (!validation.ok) {
    return res.status(400).json({ error: validation.error });
  }

  try {
    const elements = await callOverpass(query);
    return res.status(200).json({ elements });
  } catch (error) {
    const status = error.status === 429 ? 429 : error.status === 504 ? 504 : 502;
    console.error('Overpass proxy error:', error.message);
    return res.status(status).json({ error: error.message || 'Overpass query failed' });
  }
}
