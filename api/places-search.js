/**
 * Vercel Serverless Function — Google Places API (Nearby Search)
 * Searches for real truck repair shops, truck stops, and towing services.
 *
 * POST /api/places-search
 * Body: { lat, lng, query?, types?: string[], radius?: number, pageToken?: string }
 * Returns: { services: Service[], search_center: { lat, lng } }
 */

import { createClient } from '@supabase/supabase-js';

let _supabase;
function getSupabase() {
  if (!_supabase) {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment variables');
    }
    _supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  }
  return _supabase;
}

export default async function handler(req, res) {
  // CORS
  const origin = req.headers.origin || '';
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    process.env.NEXT_PUBLIC_BASE_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '',
  ].filter(Boolean);
  // For same-origin requests (SPA on Vercel) origin may be empty — allow it
  const corsOrigin = !origin || allowedOrigins.includes(origin) ? origin || '*' : allowedOrigins[0] || '*';
  res.setHeader('Access-Control-Allow-Origin', corsOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify JWT
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized — no token provided' });
  }
  const { data: { user }, error: authError } = await getSupabase().auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const API_KEY = process.env.GOOGLE_MAPS_API_KEY;
  if (!API_KEY) {
    return res.status(500).json({ error: 'Google API key not configured' });
  }

  try {
    const { lat, lng, query, types = ['repair', 'parking', 'towing'], radius = 40000, pageToken } = req.body || {};

    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat and lng are required' });
    }

    // Build search queries for different service types
    const searches = [];

    if (types.includes('repair')) {
      searches.push({
        type: 'repair',
        textQuery: query
          ? `${query} truck repair`
          : 'truck repair shop diesel mechanic heavy duty',
      });
    }
    if (types.includes('parking')) {
      searches.push({
        type: 'parking',
        textQuery: query
          ? `${query} truck stop`
          : 'truck stop fuel station',
      });
    }
    if (types.includes('towing')) {
      searches.push({
        type: 'towing',
        textQuery: query
          ? `${query} heavy duty towing`
          : 'heavy duty towing semi truck towing',
      });
    }

    // Use Places API (New) Text Search
    const allResults = [];

    for (const search of searches) {
      try {
        const body = {
          textQuery: search.textQuery,
          locationBias: {
            circle: {
              center: { latitude: lat, longitude: lng },
              radius: radius,
            },
          },
          maxResultCount: 8,
          languageCode: 'en',
        };

        const response = await fetch(
          'https://places.googleapis.com/v1/places:searchText',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': API_KEY,
              'X-Goog-FieldMask': [
                'places.id',
                'places.displayName',
                'places.formattedAddress',
                'places.location',
                'places.rating',
                'places.userRatingCount',
                'places.nationalPhoneNumber',
                'places.internationalPhoneNumber',
                'places.currentOpeningHours',
                'places.regularOpeningHours',
                'places.types',
                'places.businessStatus',
              ].join(','),
            },
            body: JSON.stringify(body),
          }
        );

        if (!response.ok) {
          console.error(`Places API error for ${search.type}:`, response.status, await response.text());
          continue;
        }

        const data = await response.json();
        const places = data.places || [];

        for (const place of places) {
          if (place.businessStatus && place.businessStatus !== 'OPERATIONAL') continue;

          // Determine hours string
          let hours = '';
          let is24Hours = false;
          const oh = place.currentOpeningHours || place.regularOpeningHours;
          if (oh) {
            is24Hours = oh.openNow !== undefined && oh.periods?.some(
              p => p.open?.hour === 0 && p.open?.minute === 0 && p.close?.hour === 23 && p.close?.minute === 59
            );
            if (oh.weekdayDescriptions?.length) {
              hours = oh.weekdayDescriptions.join('; ');
            }
          }

          // Dedupe by place id
          if (allResults.some(r => r.id === place.id)) continue;

          allResults.push({
            id: place.id,
            name: place.displayName?.text || 'Unknown',
            type: search.type,
            address: place.formattedAddress || '',
            lat: place.location?.latitude || lat,
            lng: place.location?.longitude || lng,
            rating: place.rating || 0,
            reviews: place.userRatingCount || 0,
            phone: place.nationalPhoneNumber || place.internationalPhoneNumber || '',
            hours: hours || '',
            is24Hours,
            specialties: inferSpecialties(place.types || [], search.type),
            distance: haversineKm(lat, lng, place.location?.latitude || lat, place.location?.longitude || lng),
            ai_generated: false,
          });
        }
      } catch (err) {
        console.error(`Search failed for type ${search.type}:`, err);
      }
    }

    // Sort by distance
    allResults.sort((a, b) => a.distance - b.distance);

    return res.status(200).json({
      services: allResults,
      search_center: { lat, lng },
    });
  } catch (error) {
    console.error('Places search error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 0.621371 * 10) / 10; // miles
}

function inferSpecialties(placeTypes, searchType) {
  const specs = [];
  const types = new Set(placeTypes);

  if (searchType === 'repair') {
    if (types.has('car_repair')) specs.push('General Repair');
    if (types.has('car_dealer')) specs.push('Dealer Service');
    specs.push('Truck Service');
  } else if (searchType === 'parking') {
    if (types.has('gas_station')) specs.push('Fuel');
    specs.push('Truck Parking');
  } else if (searchType === 'towing') {
    specs.push('Heavy-Duty Towing');
  }

  return specs;
}
