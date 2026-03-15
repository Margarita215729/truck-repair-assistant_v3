/**
 * Truck Infrastructure Service
 * 
 * Primary: Overpass API (OpenStreetMap) — free, no key, real worldwide data
 * Fallback: Supabase RPC (if tables have been populated via ETL)
 */
import { supabase, hasSupabaseConfig } from '@/api/supabaseClient';

const DEFAULT_RADIUS = 50; // miles
const OVERPASS_API = 'https://overpass-api.de/api/interpreter';

// ─── Overpass query builder ───────────────────────────────────────────

function milesToDeg(miles) {
  return miles / 69.0;
}

function buildBBox(lat, lng, radiusMiles) {
  const d = milesToDeg(radiusMiles);
  const dLng = radiusMiles / (69.0 * Math.cos((lat * Math.PI) / 180));
  return `${lat - d},${lng - dLng},${lat + d},${lng + dLng}`;
}

async function queryOverpass(query, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 30000);

      const res = await fetch(OVERPASS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });
      clearTimeout(timer);

      // Rate-limited or gateway timeout → retry after backoff
      if (res.status === 429 || res.status === 504) {
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, (attempt + 1) * 2000));
          continue;
        }
      }

      if (!res.ok) throw new Error(`Overpass API ${res.status}`);
      const data = await res.json();
      return data.elements || [];
    } catch (err) {
      if (attempt < retries && (err.name === 'AbortError' || err.message?.includes('429'))) {
        await new Promise(r => setTimeout(r, (attempt + 1) * 2000));
        continue;
      }
      throw err;
    }
  }
  throw new Error('Overpass API failed after retries');
}

// ─── Haversine ────────────────────────────────────────────────────────

function haversineMiles(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  const km = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(km * 0.621371 * 10) / 10;
}

function hasTruckAccess(tags = {}) {
  const hgv = String(tags.hgv || '').toLowerCase();
  const access = String(tags.access || '').toLowerCase();
  const truck = String(tags.truck || '').toLowerCase();
  return hgv === 'yes' || hgv === 'designated' || hgv === 'destination' || access === 'hgv' || truck === 'yes';
}

function isTruckRelevantParking(tags = {}) {
  const amenity = String(tags.amenity || '').toLowerCase();
  const highway = String(tags.highway || '').toLowerCase();

  if (amenity === 'fuel' || amenity === 'parking') {
    return hasTruckAccess(tags);
  }

  if (highway === 'rest_area' || highway === 'services') {
    if (hasTruckAccess(tags)) return true;
    const name = String(tags.name || '').toLowerCase();
    return name.includes('truck') || name.includes('hgv');
  }

  return false;
}

function mergeParkingData(osmParking, supabaseParking, originLat, originLng) {
  const osm = osmParking || [];
  const supa = supabaseParking || [];
  if (osm.length === 0) return supa;
  if (supa.length === 0) return osm;

  const MAX_MATCH_DISTANCE_MILES = 0.8;
  const usedSupabase = new Set();

  const enriched = osm.map((lot) => {
    let bestIdx = -1;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (let i = 0; i < supa.length; i += 1) {
      if (usedSupabase.has(i)) continue;
      const candidate = supa[i];
      const d = haversineMiles(lot.lat, lot.lng, candidate.lat, candidate.lng);
      if (d < bestDistance) {
        bestDistance = d;
        bestIdx = i;
      }
    }

    if (bestIdx < 0 || bestDistance > MAX_MATCH_DISTANCE_MILES) {
      return lot;
    }

    usedSupabase.add(bestIdx);
    const sup = supa[bestIdx];
    const isGenericName = lot.name === 'Rest Area' || lot.name === 'Truck Stop' || lot.name === 'Truck Parking';

    return {
      ...lot,
      name: isGenericName && sup.name ? sup.name : lot.name,
      total_spaces: sup.total_spaces || lot.total_spaces,
      available_spaces: sup.available_spaces ?? lot.available_spaces,
      occupancy_pct: sup.occupancy_pct ?? lot.occupancy_pct,
      occupancy_status: sup.occupancy_status || lot.occupancy_status,
      occupancy_updated_at: sup.occupancy_updated_at || lot.occupancy_updated_at,
      parking_type: sup.parking_type || lot.parking_type,
      amenities: lot.amenities?.length ? lot.amenities : (sup.amenities || []),
      operator: lot.operator || sup.operator || '',
      is24_hours: lot.is24_hours || sup.is24_hours || false,
      phone: lot.phone || sup.phone || '',
      website: lot.website || sup.website || '',
      source: 'osm+supabase',
      source_id: `${lot.source_id}|${sup.source_id || sup.id}`,
    };
  });

  const unmatchedSupa = supa
    .filter((_, idx) => !usedSupabase.has(idx))
    .map((item) => ({
      ...item,
      distance: item.distance ?? haversineMiles(originLat, originLng, item.lat, item.lng),
    }));

  return [...enriched, ...unmatchedSupa].sort((a, b) => (a.distance || 0) - (b.distance || 0));
}

// ─── Truck Parking (OSM) ─────────────────────────────────────────────

async function fetchParkingFromOSM(lat, lng, radius) {
  const bbox = buildBBox(lat, lng, radius);
  const query = `[out:json][timeout:15];
(
  node["amenity"="fuel"]["hgv"~"yes|designated"](${bbox});
  node["amenity"="parking"]["hgv"~"yes|designated"](${bbox});
  node["amenity"="parking"]["access"="hgv"](${bbox});
  node["highway"="rest_area"](${bbox});
  node["highway"="services"](${bbox});
  way["amenity"="fuel"]["hgv"~"yes|designated"](${bbox});
  way["amenity"="parking"]["hgv"~"yes|designated"](${bbox});
  way["highway"="rest_area"](${bbox});
  way["highway"="services"](${bbox});
);
out center 100;`;
  const elements = await queryOverpass(query);
  return elements.map((el) => {
    const elLat = el.lat || el.center?.lat;
    const elLng = el.lon || el.center?.lon;
    if (!elLat || !elLng) return null;
    const tags = el.tags || {};
    if (!isTruckRelevantParking(tags)) return null;
    const amenities = [];
    if (tags.fuel === 'yes' || tags.amenity === 'fuel') amenities.push('fuel');
    if (tags.shower === 'yes') amenities.push('showers');
    if (tags.restaurant === 'yes' || tags.food === 'yes') amenities.push('food');
    if (tags.internet_access === 'wlan' || tags.internet_access === 'yes') amenities.push('wifi');

    const isRestArea = tags.highway === 'rest_area' || tags.highway === 'services';
    const isTruckStop = tags.amenity === 'fuel' && (tags.hgv === 'yes' || tags.hgv === 'designated');
    const elType = el.type || 'element';

    return {
      id: `osm-${elType}-${el.id}`,
      name: tags.name || (isRestArea ? 'Rest Area' : isTruckStop ? 'Truck Stop' : 'Truck Parking'),
      address: [tags['addr:street'], tags['addr:city'], tags['addr:state']].filter(Boolean).join(', ') || '',
      latitude: elLat, longitude: elLng, lat: elLat, lng: elLng,
      _type: 'truck_parking',
      state_code: tags['addr:state'] || '',
      total_spaces: parseInt(tags.capacity) || 0,
      available_spaces: 0, occupancy_pct: 0, occupancy_status: 'unknown', occupancy_updated_at: null,
      parking_type: isRestArea ? 'public_rest_area' : isTruckStop ? 'truck_stop' : 'public',
      amenities,
      operator: tags.operator || tags.brand || '',
      is24_hours: tags.opening_hours === '24/7',
      phone: tags.phone || tags['contact:phone'] || '',
      website: tags.website || '',
      source: 'osm', source_id: `${elType}:${el.id}`,
      distance: haversineMiles(lat, lng, elLat, elLng),
    };
  }).filter(Boolean).sort((a, b) => a.distance - b.distance);
}

// ─── Weigh Stations (OSM) ────────────────────────────────────────────

async function fetchWeighStationsFromOSM(lat, lng, radius) {
  const bbox = buildBBox(lat, lng, radius);
  const query = `[out:json][timeout:15];
(
  node["amenity"="weighbridge"](${bbox});
  node["highway"="weigh_station"](${bbox});
  node["man_made"="weighbridge"](${bbox});
  way["amenity"="weighbridge"](${bbox});
  way["highway"="weigh_station"](${bbox});
);
out center 100;`;
  const elements = await queryOverpass(query);
  return elements.map((el) => {
    const elLat = el.lat || el.center?.lat;
    const elLng = el.lon || el.center?.lon;
    if (!elLat || !elLng) return null;
    const tags = el.tags || {};
    const elType = el.type || 'element';
    return {
      id: `osm-${elType}-${el.id}`,
      name: tags.name || 'Weigh Station',
      address: [tags['addr:street'], tags['addr:city'], tags['addr:state']].filter(Boolean).join(', ') || '',
      latitude: elLat, longitude: elLng, lat: elLat, lng: elLng,
      _type: 'weigh_station',
      state_code: tags['addr:state'] || '',
      highway: tags.highway_ref || tags.ref || '',
      direction: tags.direction || '',
      status: 'unknown', status_updated_at: null,
      scale_type: tags.weighbridge === 'weigh_in_motion' ? 'weigh_in_motion' : 'static',
      has_prepass: false, has_bypass: false,
      hours: tags.opening_hours || '',
      phone: tags.phone || '',
      source: 'osm', source_id: `${elType}:${el.id}`,
      distance: haversineMiles(lat, lng, elLat, elLng),
    };
  }).filter(Boolean).sort((a, b) => a.distance - b.distance);
}

// ─── Truck Restrictions (OSM) ────────────────────────────────────────

function parseMetricToFt(v) {
  if (!v) return null;
  const n = parseFloat(v);
  if (isNaN(n)) return null;
  if (v.includes("'") || v.includes('ft')) return n;
  return Math.round(n * 3.28084 * 10) / 10;
}

function parseMetricToTons(v) {
  if (!v) return null;
  const n = parseFloat(v);
  if (isNaN(n)) return null;
  if (v.includes('st') || v.includes('ton')) return n;
  return Math.round(n * 1.10231 * 10) / 10;
}

async function fetchRestrictionsFromOSM(lat, lng, radius) {
  const bbox = buildBBox(lat, lng, radius);
  const query = `[out:json][timeout:15];
(
  node["maxheight"](${bbox});
  way["maxheight"](${bbox});
  node["maxweight"](${bbox});
  way["maxweight"](${bbox});
  node["maxwidth"](${bbox});
  way["maxwidth"](${bbox});
  way["hgv"="no"](${bbox});
);
out center 100;`;
  const elements = await queryOverpass(query);
  return elements.map((el) => {
    const elLat = el.lat || el.center?.lat;
    const elLng = el.lon || el.center?.lon;
    if (!elLat || !elLng) return null;
    const tags = el.tags || {};
    const elType = el.type || 'element';

    const heightFt = parseMetricToFt(tags.maxheight);
    const weightTons = parseMetricToTons(tags.maxweight);
    const widthFt = parseMetricToFt(tags.maxwidth);
    const isHgvBan = tags.hgv === 'no';

    if (!heightFt && !weightTons && !widthFt && !isHgvBan) return null;

    let restrictionType = 'combined';
    if (heightFt && !weightTons && !widthFt) restrictionType = 'height';
    else if (weightTons && !heightFt && !widthFt) restrictionType = 'weight';
    else if (widthFt && !heightFt && !weightTons) restrictionType = 'width';
    else if (isHgvBan && !heightFt && !weightTons && !widthFt) restrictionType = 'road';

    const roadName = tags.name || tags.ref || '';

    return {
      id: `osm-${elType}-${el.id}`,
      name: roadName
        ? `${roadName}${heightFt ? ` — ${heightFt}ft` : ''}`
        : `Restriction${heightFt ? ` ${heightFt}ft` : ''}${weightTons ? ` ${weightTons}t` : ''}`,
      description: isHgvBan ? 'No trucks allowed' : '',
      latitude: elLat, longitude: elLng, lat: elLat, lng: elLng,
      lat_end: null, lng_end: null,
      _type: 'truck_restriction',
      state_code: tags['addr:state'] || '',
      road_name: roadName,
      height_ft: heightFt, weight_tons: weightTons, width_ft: widthFt, length_ft: null,
      restriction_type: restrictionType,
      is_active: true, detour_info: '',
      source: 'osm', source_id: `${elType}:${el.id}`,
      distance: haversineMiles(lat, lng, elLat, elLng),
    };
  }).filter(Boolean).sort((a, b) => a.distance - b.distance);
}

// ─── Supabase fallback ───────────────────────────────────────────────

async function fetchParkingFromSupabase(lat, lng, radius) {
  if (!hasSupabaseConfig || !supabase) return [];
  const { data, error } = await supabase.rpc('nearby_truck_parking', { p_lat: lat, p_lng: lng, p_radius_miles: radius });
  if (error) { console.warn('Supabase truck parking error:', error); return []; }
  return (data || []).map(r => ({ ...r, _type: 'truck_parking', lat: r.latitude, lng: r.longitude }));
}

async function fetchWeighStationsFromSupabase(lat, lng, radius) {
  if (!hasSupabaseConfig || !supabase) return [];
  const { data, error } = await supabase.rpc('nearby_weigh_stations', { p_lat: lat, p_lng: lng, p_radius_miles: radius });
  if (error) { console.warn('Supabase weigh stations error:', error); return []; }
  return (data || []).map(r => ({ ...r, _type: 'weigh_station', lat: r.latitude, lng: r.longitude }));
}

async function fetchRestrictionsFromSupabase(lat, lng, radius) {
  if (!hasSupabaseConfig || !supabase) return [];
  const { data, error } = await supabase.rpc('nearby_truck_restrictions', { p_lat: lat, p_lng: lng, p_radius_miles: radius });
  if (error) { console.warn('Supabase restrictions error:', error); return []; }
  return (data || []).map(r => ({ ...r, _type: 'truck_restriction', lat: r.latitude, lng: r.longitude, lat_end: r.latitude_end, lng_end: r.longitude_end }));
}

// ─── Public API ───────────────────────────────────────────────────────

export async function fetchNearbyParking(lat, lng, radius = DEFAULT_RADIUS) {
  let osm = [];
  let supa = [];

  try {
    osm = await fetchParkingFromOSM(lat, lng, radius);
  } catch (e) {
    console.warn('Overpass parking failed:', e.message);
  }

  try {
    supa = await fetchParkingFromSupabase(lat, lng, radius);
  } catch (e) {
    console.warn('Supabase parking failed:', e.message);
  }

  return mergeParkingData(osm, supa, lat, lng);
}

export async function fetchNearbyWeighStations(lat, lng, radius = DEFAULT_RADIUS) {
  try {
    const osm = await fetchWeighStationsFromOSM(lat, lng, radius);
    if (osm.length > 0) return osm;
  } catch (e) { console.warn('Overpass weigh stations failed, trying Supabase:', e.message); }
  return fetchWeighStationsFromSupabase(lat, lng, radius);
}

export async function fetchNearbyRestrictions(lat, lng, radius = DEFAULT_RADIUS) {
  try {
    const osm = await fetchRestrictionsFromOSM(lat, lng, radius);
    if (osm.length > 0) return osm;
  } catch (e) { console.warn('Overpass restrictions failed, trying Supabase:', e.message); }
  return fetchRestrictionsFromSupabase(lat, lng, radius);
}

export async function fetchAllInfrastructure(lat, lng, radius = DEFAULT_RADIUS) {
  // ── Single combined Overpass query — avoids rate-limiting from 3 parallel requests
  try {
    const osmData = await fetchAllFromOSM(lat, lng, radius);
    const supabaseParking = await fetchParkingFromSupabase(lat, lng, radius);
    return {
      ...osmData,
      parking: mergeParkingData(osmData.parking, supabaseParking, lat, lng),
    };
  } catch (e) {
    console.warn('Overpass combined query failed, falling back to Supabase:', e.message);
  }

  // Fallback: try each type from Supabase independently
  const [parking, weighStations, restrictions] = await Promise.all([
    fetchParkingFromSupabase(lat, lng, radius),
    fetchWeighStationsFromSupabase(lat, lng, radius),
    fetchRestrictionsFromSupabase(lat, lng, radius),
  ]);
  return { parking, weighStations, restrictions };
}

/**
 * Combined Overpass fetch — one HTTP request for all infrastructure types.
 * Prevents 429 rate-limiting that occurred with 3 parallel requests.
 */
async function fetchAllFromOSM(lat, lng, radius) {
  const bbox = buildBBox(lat, lng, radius);
  const query = `[out:json][timeout:25];
(
  node["amenity"="fuel"]["hgv"~"yes|designated"](${bbox});
  node["amenity"="parking"]["hgv"~"yes|designated"](${bbox});
  node["amenity"="parking"]["access"="hgv"](${bbox});
  node["highway"="rest_area"](${bbox});
  node["highway"="services"](${bbox});
  way["amenity"="fuel"]["hgv"~"yes|designated"](${bbox});
  way["amenity"="parking"]["hgv"~"yes|designated"](${bbox});
  way["highway"="rest_area"](${bbox});
  way["highway"="services"](${bbox});
  node["amenity"="weighbridge"](${bbox});
  node["highway"="weigh_station"](${bbox});
  node["man_made"="weighbridge"](${bbox});
  way["amenity"="weighbridge"](${bbox});
  way["highway"="weigh_station"](${bbox});
  node["maxheight"](${bbox});
  way["maxheight"](${bbox});
  node["maxweight"](${bbox});
  way["maxweight"](${bbox});
  node["maxwidth"](${bbox});
  way["maxwidth"](${bbox});
  way["hgv"="no"](${bbox});
);
out center 300;`;

  const elements = await queryOverpass(query);

  const parking = [];
  const weighStations = [];
  const restrictions = [];
  const seenIds = new Set();

  for (const el of elements) {
    const tags = el.tags || {};
    const elLat = el.lat || el.center?.lat;
    const elLng = el.lon || el.center?.lon;
    if (!elLat || !elLng) continue;

    const elType = el.type || 'element';
    const id = `osm-${elType}-${el.id}`;
    if (seenIds.has(id)) continue;
    seenIds.add(id);

    // ── classify: weigh station > restriction > parking ──
    const isWeighStation = tags.amenity === 'weighbridge' || tags.highway === 'weigh_station' || tags.man_made === 'weighbridge';

    if (isWeighStation) {
      weighStations.push({
        id,
        name: tags.name || 'Weigh Station',
        address: [tags['addr:street'], tags['addr:city'], tags['addr:state']].filter(Boolean).join(', ') || '',
        latitude: elLat, longitude: elLng, lat: elLat, lng: elLng,
        _type: 'weigh_station',
        state_code: tags['addr:state'] || '',
        highway: tags.highway_ref || tags.ref || '',
        direction: tags.direction || '',
        status: 'unknown', status_updated_at: null,
        scale_type: tags.weighbridge === 'weigh_in_motion' ? 'weigh_in_motion' : 'static',
        has_prepass: false, has_bypass: false,
        hours: tags.opening_hours || '',
        phone: tags.phone || '',
        source: 'osm', source_id: `${elType}:${el.id}`,
        distance: haversineMiles(lat, lng, elLat, elLng),
      });
      continue;
    }

    const heightFt = parseMetricToFt(tags.maxheight);
    const weightTons = parseMetricToTons(tags.maxweight);
    const widthFt = parseMetricToFt(tags.maxwidth);
    const isHgvBan = tags.hgv === 'no';
    const hasRestriction = heightFt || weightTons || widthFt || isHgvBan;

    if (hasRestriction) {
      let restrictionType = 'combined';
      if (heightFt && !weightTons && !widthFt) restrictionType = 'height';
      else if (weightTons && !heightFt && !widthFt) restrictionType = 'weight';
      else if (widthFt && !heightFt && !weightTons) restrictionType = 'width';
      else if (isHgvBan && !heightFt && !weightTons && !widthFt) restrictionType = 'road';

      const roadName = tags.name || tags.ref || '';
      restrictions.push({
        id,
        name: roadName
          ? `${roadName}${heightFt ? ` — ${heightFt}ft` : ''}`
          : `Restriction${heightFt ? ` ${heightFt}ft` : ''}${weightTons ? ` ${weightTons}t` : ''}`,
        description: isHgvBan ? 'No trucks allowed' : '',
        latitude: elLat, longitude: elLng, lat: elLat, lng: elLng,
        lat_end: null, lng_end: null,
        _type: 'truck_restriction',
        state_code: tags['addr:state'] || '',
        road_name: roadName,
        height_ft: heightFt, weight_tons: weightTons, width_ft: widthFt, length_ft: null,
        restriction_type: restrictionType,
        is_active: true, detour_info: '',
        source: 'osm', source_id: `${elType}:${el.id}`,
        distance: haversineMiles(lat, lng, elLat, elLng),
      });
      continue;
    }

    // Everything else → truck parking
    if (!isTruckRelevantParking(tags)) continue;
    const amenities = [];
    if (tags.fuel === 'yes' || tags.amenity === 'fuel') amenities.push('fuel');
    if (tags.shower === 'yes') amenities.push('showers');
    if (tags.restaurant === 'yes' || tags.food === 'yes') amenities.push('food');
    if (tags.internet_access === 'wlan' || tags.internet_access === 'yes') amenities.push('wifi');

    const isRestArea = tags.highway === 'rest_area' || tags.highway === 'services';
    const isTruckStop = tags.amenity === 'fuel' && (tags.hgv === 'yes' || tags.hgv === 'designated');

    parking.push({
      id,
      name: tags.name || (isRestArea ? 'Rest Area' : isTruckStop ? 'Truck Stop' : 'Truck Parking'),
      address: [tags['addr:street'], tags['addr:city'], tags['addr:state']].filter(Boolean).join(', ') || '',
      latitude: elLat, longitude: elLng, lat: elLat, lng: elLng,
      _type: 'truck_parking',
      state_code: tags['addr:state'] || '',
      total_spaces: parseInt(tags.capacity) || 0,
      available_spaces: 0, occupancy_pct: 0, occupancy_status: 'unknown', occupancy_updated_at: null,
      parking_type: isRestArea ? 'public_rest_area' : isTruckStop ? 'truck_stop' : 'public',
      amenities,
      operator: tags.operator || tags.brand || '',
      is24_hours: tags.opening_hours === '24/7',
      phone: tags.phone || tags['contact:phone'] || '',
      website: tags.website || '',
      source: 'osm', source_id: `${elType}:${el.id}`,
      distance: haversineMiles(lat, lng, elLat, elLng),
    });
  }

  return {
    parking: parking.sort((a, b) => a.distance - b.distance),
    weighStations: weighStations.sort((a, b) => a.distance - b.distance),
    restrictions: restrictions.sort((a, b) => a.distance - b.distance),
  };
}

// ─── UI helpers ───────────────────────────────────────────────────────

export function occupancyColor(status) {
  switch (status) {
    case 'open':    return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'partial': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'full':    return 'bg-red-500/20 text-red-400 border-red-500/30';
    default:        return 'bg-white/10 text-white/60 border-white/20';
  }
}

export function weighStationColor(status) {
  switch (status) {
    case 'open':   return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'closed': return 'bg-red-500/20 text-red-400 border-red-500/30';
    default:       return 'bg-white/10 text-white/60 border-white/20';
  }
}

export function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
