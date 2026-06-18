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
import { applyCors } from './lib/cors.js';

let _supabase;
function getSupabase() {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_STORAGE_SUPABASE_SUPABASE_URL;
    const key = process.env.STORAGE_SUPABASE_SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('NEXT_PUBLIC_STORAGE_SUPABASE_SUPABASE_URL and STORAGE_SUPABASE_SUPABASE_SERVICE_ROLE_KEY required');
    _supabase = createClient(url, key);
  }
  return _supabase;
}

const STORE_TYPES = [
  'auto_parts_store',
  'car_repair',
];

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

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
