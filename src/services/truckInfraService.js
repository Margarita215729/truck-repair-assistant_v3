/**
 * Truck Infrastructure Service
 * Queries Supabase for nearby truck parking, weigh stations, and route restrictions
 * using the RPC functions defined in migration 007.
 */
import { supabase, hasSupabaseConfig } from '@/api/supabaseClient';

const DEFAULT_RADIUS = 50; // miles

/**
 * Fetch nearby truck parking lots with occupancy data.
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {number} [radius=50] - Search radius in miles
 * @returns {Promise<Array>} Parking lots with occupancy info
 */
export async function fetchNearbyParking(lat, lng, radius = DEFAULT_RADIUS) {
  if (!hasSupabaseConfig || !supabase) return [];

  const { data, error } = await supabase.rpc('nearby_truck_parking', {
    p_lat: lat,
    p_lng: lng,
    p_radius_miles: radius,
  });

  if (error) {
    console.warn('Failed to fetch truck parking:', error);
    return [];
  }
  return (data || []).map(normalizeParking);
}

/**
 * Fetch nearby weigh stations.
 */
export async function fetchNearbyWeighStations(lat, lng, radius = DEFAULT_RADIUS) {
  if (!hasSupabaseConfig || !supabase) return [];

  const { data, error } = await supabase.rpc('nearby_weigh_stations', {
    p_lat: lat,
    p_lng: lng,
    p_radius_miles: radius,
  });

  if (error) {
    console.warn('Failed to fetch weigh stations:', error);
    return [];
  }
  return (data || []).map(normalizeWeighStation);
}

/**
 * Fetch nearby truck route restrictions.
 */
export async function fetchNearbyRestrictions(lat, lng, radius = DEFAULT_RADIUS) {
  if (!hasSupabaseConfig || !supabase) return [];

  const { data, error } = await supabase.rpc('nearby_truck_restrictions', {
    p_lat: lat,
    p_lng: lng,
    p_radius_miles: radius,
  });

  if (error) {
    console.warn('Failed to fetch truck restrictions:', error);
    return [];
  }
  return (data || []).map(normalizeRestriction);
}

/**
 * Fetch all three infrastructure layers in parallel.
 */
export async function fetchAllInfrastructure(lat, lng, radius = DEFAULT_RADIUS) {
  const [parking, weighStations, restrictions] = await Promise.all([
    fetchNearbyParking(lat, lng, radius),
    fetchNearbyWeighStations(lat, lng, radius),
    fetchNearbyRestrictions(lat, lng, radius),
  ]);
  return { parking, weighStations, restrictions };
}

// ─── Normalization helpers ────────────────────────────────────────────

function normalizeParking(row) {
  return {
    ...row,
    _type: 'truck_parking',
    lat: row.latitude,
    lng: row.longitude,
  };
}

function normalizeWeighStation(row) {
  return {
    ...row,
    _type: 'weigh_station',
    lat: row.latitude,
    lng: row.longitude,
  };
}

function normalizeRestriction(row) {
  return {
    ...row,
    _type: 'truck_restriction',
    lat: row.latitude,
    lng: row.longitude,
    lat_end: row.latitude_end,
    lng_end: row.longitude_end,
  };
}

// ─── Occupancy helpers ────────────────────────────────────────────────

/**
 * Returns a human-readable occupancy color class for UI badges.
 */
export function occupancyColor(status) {
  switch (status) {
    case 'open':    return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'partial': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'full':    return 'bg-red-500/20 text-red-400 border-red-500/30';
    default:        return 'bg-white/10 text-white/60 border-white/20';
  }
}

/**
 * Returns a human-readable weigh station status color.
 */
export function weighStationColor(status) {
  switch (status) {
    case 'open':   return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'closed': return 'bg-red-500/20 text-red-400 border-red-500/30';
    default:       return 'bg-white/10 text-white/60 border-white/20';
  }
}

/**
 * Format "time ago" for occupancy_updated_at.
 */
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
