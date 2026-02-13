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

async function queryOverpass(query) {
  const res = await fetch(OVERPASS_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (!res.ok) throw new Error(`Overpass API ${res.status}`);
  const data = await res.json();
  return data.elements || [];
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
    const amenities = [];
    if (tags.fuel === 'yes' || tags.amenity === 'fuel') amenities.push('fuel');
    if (tags.shower === 'yes') amenities.push('showers');
    if (tags.restaurant === 'yes' || tags.food === 'yes') amenities.push('food');
    if (tags.internet_access === 'wlan' || tags.internet_access === 'yes') amenities.push('wifi');

    const isRestArea = tags.highway === 'rest_area' || tags.highway === 'services';
    const isTruckStop = tags.amenity === 'fuel' && (tags.hgv === 'yes' || tags.hgv === 'designated');

    return {
      id: `osm-${el.id}`,
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
      source: 'osm', source_id: String(el.id),
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
    return {
      id: `osm-${el.id}`,
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
      source: 'osm', source_id: String(el.id),
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
      id: `osm-${el.id}`,
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
      source: 'osm', source_id: String(el.id),
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
  try {
    const osm = await fetchParkingFromOSM(lat, lng, radius);
    if (osm.length > 0) return osm;
  } catch (e) { console.warn('Overpass parking failed, trying Supabase:', e.message); }
  return fetchParkingFromSupabase(lat, lng, radius);
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
  const [parking, weighStations, restrictions] = await Promise.all([
    fetchNearbyParking(lat, lng, radius),
    fetchNearbyWeighStations(lat, lng, radius),
    fetchNearbyRestrictions(lat, lng, radius),
  ]);
  return { parking, weighStations, restrictions };
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
