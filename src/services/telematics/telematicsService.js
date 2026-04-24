/**
 * Frontend Telematics Service
 *
 * Client-side service for interacting with the telematics backend.
 * Provides:
 * - connectProvider(provider) — redirects to OAuth start
 * - getProviderStatus() — returns connection status
 * - getTruckStateSnapshot(vehicleProfileId) — fetches truck state with AI interpretation
 * - disconnectProvider(provider) — deactivates a connection via DELETE /api/telematics/vehicles
 */
import { supabase, hasSupabaseConfig } from '@/api/supabaseClient';

const API_BASE = '/api/telematics';

/**
 * Get the Supabase auth token from the current session.
 * Works with the existing AuthContext pattern.
 */
async function getAuthToken() {
  try {
    if (!hasSupabaseConfig || !supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token || null;
  } catch {
    return null;
  }
}

/**
 * Start provider connection.
 * For OAuth providers (samsara, motive): fetches the OAuth URL and redirects.
 * For credential providers (geotab, verizonconnect, omnitracs): returns
 * { authType: 'credentials', requiredFields, optionalFields, connectEndpoint }
 * so the UI can show a credential form.
 */
export async function connectProvider(provider) {
  const token = await getAuthToken();
  if (!token) throw new Error('Not authenticated');

  const resp = await fetch(`${API_BASE}/oauth-start?provider=${encodeURIComponent(provider)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${resp.status}`);
  }

  const data = await resp.json();

  // Credential-based provider — return metadata for the UI to render a form
  if (data.authType === 'credentials') {
    return data;
  }

  // OAuth provider — redirect to authorization URL
  window.location.href = data.url;
}

/**
 * Submit credentials for a credential-based provider (geotab, verizonconnect, omnitracs).
 *
 * @param {string} provider - Provider name
 * @param {Record<string, string>} credentials - e.g. { database, userName, password, server }
 * @returns {{ ok, provider, vehicles_found, auto_mapped }}
 */
export async function connectProviderWithCredentials(provider, credentials) {
  const token = await getAuthToken();
  if (!token) throw new Error('Not authenticated');

  const resp = await fetch(`${API_BASE}/credential-connect`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ provider, credentials }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${resp.status}`);
  }

  return await resp.json();
}

/**
 * Check the connection status for all providers.
 * Returns an array of { provider, status, last_sync_at, provider_vehicle_id }
 */
export async function getProviderStatus() {
  const token = await getAuthToken();
  if (!token) return [];

  try {
    const resp = await fetch(`${API_BASE}/truck-state-snapshot?vehicleProfileId=_status_only`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) return [];
    const data = await resp.json();
    return data?.connections || [];
  } catch {
    return [];
  }
}

/**
 * Fetch the full truck state snapshot with AI interpretation.
 *
 * @param {string} vehicleProfileId - The vehicle profile ID from the trucks table
 * @returns {{ snapshot, interpretation, meta } | null}
 */
export async function getTruckStateSnapshot(vehicleProfileId) {
  const token = await getAuthToken();
  if (!token) return null;

  try {
    const resp = await fetch(
      `${API_BASE}/truck-state-snapshot?vehicleProfileId=${encodeURIComponent(vehicleProfileId)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!resp.ok) {
      console.error('Truck state snapshot fetch failed:', resp.status);
      return null;
    }
    return await resp.json();
  } catch (err) {
    console.error('Truck state snapshot error:', err);
    return null;
  }
}

/**
 * Disconnect a telematics provider.
 * Marks the connection as inactive.
 */
export async function disconnectProvider(provider) {
  const token = await getAuthToken();
  if (!token) throw new Error('Not authenticated');

  const resp = await fetch(`${API_BASE}/vehicles?provider=${encodeURIComponent(provider)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${resp.status}`);
  }

  return await resp.json();
}

/**
 * List provider vehicles and truck profiles for mapping.
 * Returns { providers: [...], truckProfiles: [...] }
 */
export async function getProviderVehicles() {
  const token = await getAuthToken();
  if (!token) return { providers: [], truckProfiles: [] };

  try {
    const resp = await fetch(`${API_BASE}/vehicles`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return await resp.json();
  } catch (err) {
    console.error('getProviderVehicles error:', err);
    return { providers: [], truckProfiles: [] };
  }
}

/**
 * Map a provider vehicle to a truck profile.
 */
export async function mapVehicle(connectionId, providerVehicleId, vehicleProfileId) {
  const token = await getAuthToken();
  if (!token) throw new Error('Not authenticated');

  const resp = await fetch(`${API_BASE}/vehicles`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ connectionId, providerVehicleId, vehicleProfileId }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${resp.status}`);
  }
  return await resp.json();
}

/**
 * Format the snapshot's status badge for display.
 * Returns { text, color, status }
 */
export function getStatusBadge(snapshot) {
  if (!snapshot) return { text: 'Not Connected', color: 'gray', status: 'disconnected' };

  const status = snapshot.summary_status || 'unknown';
  const faultCount = snapshot.stats?.total_active_faults || 0;

  const colorMap = {
    green: 'green',
    amber: 'yellow',
    red: 'red',
    unknown: 'gray',
  };

  let text = '';
  if (status === 'green') text = 'All Systems OK';
  else if (status === 'amber') text = `${faultCount} Warning${faultCount !== 1 ? 's' : ''}`;
  else if (status === 'red') text = `${faultCount} Critical Fault${faultCount !== 1 ? 's' : ''}`;
  else text = 'Unknown Status';

  return { text, color: colorMap[status] || 'gray', status };
}
