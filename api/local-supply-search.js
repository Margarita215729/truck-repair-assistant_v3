/**
 * Vercel Serverless Function — Local Supply Search
 *
 * Finds nearby auto parts stores using Google Places API (New).
 * Returns stores with inventory potential for truck parts.
 *
 * POST /api/local-supply-search
 * Body: { lat, lng, partName?, partNumber?, radius? }
 * Returns: { stores: [], query }
 */

import { createClient } from '@supabase/supabase-js';

let _supabase;
function getSupabase() {
  if (!_supabase) {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required');
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
].filter(Boolean);

const STORE_TYPES = [
  'auto_parts_store',
  'car_repair',
];

export default async function handler(req, res) {
  // CORS
  const origin = req.headers.origin || '';
  const corsOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : '';
  if (corsOrigin) res.setHeader('Access-Control-Allow-Origin', corsOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // JWT auth
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { data: { user }, error: authError } = await getSupabase().auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Invalid or expired token' });

  const API_KEY = process.env.GOOGLE_MAPS_API_KEY;
  if (!API_KEY) {
    return res.status(200).json({
      stores: [],
      error: 'Local supply search not configured — missing GOOGLE_MAPS_API_KEY',
    });
  }

  const { lat, lng, partName, partNumber, radius = 25000 } = req.body || {};

  if (!lat || !lng) {
    return res.status(400).json({ error: 'Missing lat/lng in request body' });
  }

  try {
    // Build text query for Places API
    const queryParts = ['truck parts store'];
    if (partName) queryParts.push(partName);
    if (partNumber) queryParts.push(partNumber);
    const textQuery = queryParts.join(' ');

    // Use Places API (New) — Text Search
    const placesUrl = 'https://places.googleapis.com/v1/places:searchText';
    const response = await fetch(placesUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': [
          'places.displayName',
          'places.formattedAddress',
          'places.location',
          'places.nationalPhoneNumber',
          'places.rating',
          'places.userRatingCount',
          'places.currentOpeningHours',
          'places.websiteUri',
          'places.id',
          'places.types',
          'places.businessStatus',
        ].join(','),
      },
      body: JSON.stringify({
        textQuery,
        locationBias: {
          circle: {
            center: { latitude: Number(lat), longitude: Number(lng) },
            radius: Math.min(Number(radius), 50000),
          },
        },
        maxResultCount: 10,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Places API error:', response.status, errText);
      return res.status(200).json({
        stores: [],
        error: `Places API returned ${response.status}`,
      });
    }

    const data = await response.json();

    const stores = (data.places || [])
      .filter(p => p.businessStatus !== 'CLOSED_PERMANENTLY')
      .map(p => ({
        name: p.displayName?.text || '',
        address: p.formattedAddress || '',
        phone: p.nationalPhoneNumber || null,
        lat: p.location?.latitude || null,
        lng: p.location?.longitude || null,
        rating: p.rating || null,
        reviewCount: p.userRatingCount || null,
        openNow: p.currentOpeningHours?.openNow ?? null,
        website: p.websiteUri || null,
        placeId: p.id || null,
        types: p.types || [],
        distance: calculateDistance(lat, lng, p.location?.latitude, p.location?.longitude),
      }))
      .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));

    return res.status(200).json({ stores, query: textQuery });
  } catch (error) {
    console.error('Local supply search error:', error);
    return res.status(200).json({
      stores: [],
      error: 'Local supply search temporarily unavailable',
    });
  }
}

/** Haversine distance in miles. */
function calculateDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 3959; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
