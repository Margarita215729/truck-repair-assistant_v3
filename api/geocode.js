/**
 * Vercel Serverless Function — Geocode proxy
 * Proxies Google Geocoding API to avoid exposing API key on client.
 *
 * POST /api/geocode
 * Body: { address: string }
 * Returns: { lat, lng } | { error: string }
 */

import { createClient } from '@supabase/supabase-js';
import { applyCors } from './lib/cors.js';

let _supabase;
function getSupabase() {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_STORAGE_SUPABASE_SUPABASE_URL;
    const key = process.env.STORAGE_SUPABASE_SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error('NEXT_PUBLIC_STORAGE_SUPABASE_SUPABASE_URL and STORAGE_SUPABASE_SUPABASE_SERVICE_ROLE_KEY must be set in environment variables');
    }
    _supabase = createClient(url, key);
  }
  return _supabase;
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

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
