/**
 * Vercel Serverless Function — Geocode proxy
 * Proxies Google Geocoding API to avoid exposing API key on client.
 *
 * POST /api/geocode
 * Body: { address: string }
 * Returns: { lat, lng } | { error: string }
 */

import { createClient } from '@supabase/supabase-js';

let _supabase;
function getSupabase() {
  if (!_supabase) {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment variables');
    }
    _supabase = createClient(url, key);
  }
  return _supabase;
}

const ALLOWED_ORIGINS = [
  'https://tra.tools',
  'https://truck-repair-assistantv3-main.vercel.app',
  'https://truck-repair-assistant-v3.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.NEXT_PUBLIC_BASE_URL,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '',
].filter(Boolean);

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  const corsOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  res.setHeader('Access-Control-Allow-Origin', corsOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Vary', 'Origin');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify JWT
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { data: { user }, error: authError } = await getSupabase().auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const API_KEY = process.env.GOOGLE_MAPS_API_KEY;
  if (!API_KEY) {
    return res.status(500).json({ error: 'Google API key not configured' });
  }

  const { address } = req.body || {};
  if (!address || typeof address !== 'string') {
    return res.status(400).json({ error: 'address is required and must be a string' });
  }
  if (address.length > 500) {
    return res.status(400).json({ error: 'address too long (max 500 characters)' });
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.results?.[0]?.geometry?.location) {
      const { lat, lng } = data.results[0].geometry.location;
      return res.status(200).json({ lat, lng });
    }

    return res.status(404).json({ error: 'Location not found' });
  } catch (error) {
    console.error('Geocode error:', error);
    return res.status(500).json({ error: 'Geocoding failed' });
  }
}
