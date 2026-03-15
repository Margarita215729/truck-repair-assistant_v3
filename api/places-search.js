/**
 * Vercel Serverless Function — Google Places API (Nearby Search)
 * Searches for real truck repair shops, truck stops, and towing services.
 *
 * POST /api/places-search
 * Body: { lat, lng, query?, types?: string[], serviceTypes?: string[], radius?: number, pageToken?: string }
 * Returns: { services: Service[], search_center: { lat, lng } }
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

export default async function handler(req, res) {
  // CORS
  const origin = req.headers.origin || '';
  const allowedOrigins = [
    'https://tra.tools',
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
    const { lat, lng, query, types = ['repair', 'parking', 'towing'], serviceTypes = [], radius = 40000 } = req.body || {};

    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat and lng are required' });
    }

    // Map serviceTypes IDs to search-friendly keywords
    const SERVICE_TYPE_KEYWORDS = {
      semi_truck_service: 'semi truck service',
      tires: 'truck tire service',
      truck_wash: 'truck wash',
      oil_change: 'truck oil change lube',
    };

    // Build search profiles with explicit semantics and fallback variants
    const searches = [];

    if (types.includes('repair')) {
      if (serviceTypes.length > 0) {
        for (const st of serviceTypes) {
          const kw = SERVICE_TYPE_KEYWORDS[st] || st.replace(/_/g, ' ');
          searches.push({
            type: 'repair',
            textQueries: [
              `heavy duty truck ${kw}`,
              `diesel commercial truck ${kw}`,
            ],
          });
        }
      } else {
        searches.push({
          type: 'repair',
          textQueries: [
            'truck repair shop diesel mechanic heavy duty',
            'commercial truck service center fleet diesel repair',
          ],
        });
      }
    }

    // Keep API type key as "parking" for compatibility, but query explicitly as truck stops
    if (types.includes('parking')) {
      searches.push({
        type: 'parking',
        textQueries: [
          'truck stop fuel station semi truck parking',
          'truck stop diesel fuel commercial parking',
        ],
      });
    }

    if (types.includes('towing')) {
      searches.push({
        type: 'towing',
        textQueries: [
          'heavy duty towing semi truck towing roadside',
          'commercial truck wrecker diesel towing 24 hour',
        ],
      });
    }

    const queryTerm = typeof query === 'string' ? query.trim() : '';
    if (queryTerm) {
      for (const search of searches) {
        const q = queryTerm.toLowerCase();
        const injected = search.textQueries.map(text => `${q} ${text}`);
        search.textQueries = [...injected, ...search.textQueries, q];
      }
    }

    const passRadii = [
      Math.min(Number(radius) || 40000, 50000),
      Math.min(Math.round((Number(radius) || 40000) * 1.8), 90000),
    ];

    // Use Places API (New) Text Search
    const allResults = [];

    for (const search of searches) {
      for (const passRadius of passRadii) {
        for (const textQuery of search.textQueries) {
          try {
            const body = {
              textQuery,
              locationBias: {
                circle: {
                  center: { latitude: lat, longitude: lng },
                  radius: passRadius,
                },
              },
              maxResultCount: 15,
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
              const errText = await response.text();
              console.error(`Places API error for ${search.type}:`, response.status, errText);
              if (allResults.length === 0 && searches.indexOf(search) === searches.length - 1) {
                return res.status(502).json({
                  error: `Google Places API error (${response.status}). Check that "Places API (New)" is enabled in Google Cloud Console and the API key is valid.`,
                  details: errText.slice(0, 300),
                });
              }
              continue;
            }

            const data = await response.json();
            const places = data.places || [];
            console.log(`Places API [${search.type}] radius=${passRadius}: returned ${places.length} results`);

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

              const relevanceScore = getTruckRelevance(search.type, place);
              if ((search.type === 'repair' || search.type === 'towing') && relevanceScore < 2) {
                continue;
              }

              const distance = haversineKm(lat, lng, place.location?.latitude || lat, place.location?.longitude || lng);
              const weightedScore = getWeightedScore({
                searchType: search.type,
                place,
                relevanceScore,
                distance,
                is24Hours,
              });

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
                distance,
                relevanceScore,
                weightedScore,
                ai_generated: false,
              });
            }

            // If we already have enough good matches for this type, stop widening this type.
            const typeCount = allResults.filter(r => r.type === search.type).length;
            if (typeCount >= 12) break;
          } catch (err) {
            console.error(`Search failed for type ${search.type}:`, err);
          }
        }
        const typeCount = allResults.filter(r => r.type === search.type).length;
        if (typeCount >= 12) break;
      }
    }

    // Sort by weighted score first, then distance as tie-breaker
    allResults.sort((a, b) => (b.weightedScore - a.weightedScore) || (a.distance - b.distance));

    console.log(`Places search total: ${allResults.length} results for coords [${lat}, ${lng}], types: ${types.join(',')}`);

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

function getTruckRelevance(searchType, place) {
  const name = (place.displayName?.text || '').toLowerCase();
  const address = (place.formattedAddress || '').toLowerCase();
  const typeSet = new Set(place.types || []);
  const blob = `${name} ${address}`;

  const hasAny = terms => terms.some(term => blob.includes(term));

  if (searchType === 'repair') {
    let score = 0;
    if (typeSet.has('car_repair')) score += 2;
    if (hasAny(['truck', 'diesel', 'fleet', 'heavy duty', 'commercial vehicle'])) score += 2;
    if (hasAny(['semi', 'tractor trailer', 'rig'])) score += 1;
    if (hasAny(['mobile', 'road service', 'onsite'])) score += 1;
    if (hasAny(['transmission', 'engine', 'brake', 'tire', 'alignment'])) score += 1;
    return score;
  }

  if (searchType === 'towing') {
    let score = 0;
    if (hasAny(['towing', 'wrecker', 'recovery'])) score += 2;
    if (hasAny(['heavy duty', 'semi', 'truck', 'commercial'])) score += 2;
    if (hasAny(['24 hour', '24/7', 'roadside', 'emergency'])) score += 1;
    return score;
  }

  if (searchType === 'parking') {
    let score = 0;
    if (typeSet.has('gas_station')) score += 2;
    if (hasAny(['truck stop', 'truck parking', 'diesel'])) score += 2;
    if (hasAny(['travel center', 'rest area', 'fuel'])) score += 1;
    return score;
  }

  return 0;
}

function getWeightedScore({ searchType, place, relevanceScore, distance, is24Hours }) {
  const rating = Number(place.rating) || 0;
  const reviewCount = Number(place.userRatingCount) || 0;
  const reviewComponent = Math.min(Math.log10(reviewCount + 1), 3);
  const distancePenalty = Math.min(distance / 40, 3.5);
  const openComponent = is24Hours ? 0.9 : 0;
  const emergencyBoost = (searchType === 'towing' && is24Hours) ? 1.2 : 0;
  return (relevanceScore * 2.6) + (rating * 0.8) + reviewComponent + openComponent + emergencyBoost - distancePenalty;
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
