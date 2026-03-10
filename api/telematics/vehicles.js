/**
 * Telematics Vehicles — List provider vehicles and map them to truck profiles
 *
 * GET  /api/telematics/vehicles  — Lists vehicles from connected provider
 * POST /api/telematics/vehicles  — Maps a provider vehicle to a truck profile
 *
 * Both require Supabase auth (Authorization: Bearer <jwt>)
 */
import { createClient } from '@supabase/supabase-js';
import { loadTokens } from './lib/tokenVault.js';

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase config');
  return createClient(url, key);
}

async function getUser(req) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const sb = createClient(url, anonKey);

  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return null;

  const { data: { user }, error } = await sb.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

export default async function handler(req, res) {
  const user = await getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const sb = getSupabase();

  if (req.method === 'GET') {
    return handleListVehicles(req, res, sb, user);
  } else if (req.method === 'POST') {
    return handleMapVehicle(req, res, sb, user);
  } else if (req.method === 'DELETE') {
    return handleDisconnect(req, res, sb, user);
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleListVehicles(req, res, sb, user) {
  try {
    // Get user's active telematics connections
    const { data: connections, error: connErr } = await sb
      .from('telematics_connections')
      .select('id, provider, provider_vehicle_id, provider_org_id, token_ref, status')
      .eq('user_id', user.id)
      .in('status', ['active', 'needs_reauth']);

    if (connErr) throw new Error(connErr.message);
    if (!connections?.length) {
      return res.status(200).json({ vehicles: [], connections: [] });
    }

    // Fetch vehicles from each provider
    const allVehicles = [];
    for (const conn of connections) {
      if (conn.status !== 'active') {
        allVehicles.push({
          connectionId: conn.id,
          provider: conn.provider,
          status: conn.status,
          vehicles: [],
        });
        continue;
      }

      try {
        const tokens = await loadTokens(conn.token_ref);
        if (!tokens?.access_token) {
          allVehicles.push({ connectionId: conn.id, provider: conn.provider, status: 'no_token', vehicles: [] });
          continue;
        }

        const { fetchVehicles } = await import(`./lib/providers/${conn.provider}.js`);
        const vehicles = await fetchVehicles({ accessToken: tokens.access_token });

        allVehicles.push({
          connectionId: conn.id,
          provider: conn.provider,
          status: 'active',
          currentMappedVehicleId: conn.provider_vehicle_id,
          vehicles,
        });
      } catch (err) {
        console.error(`Failed to fetch vehicles for ${conn.provider}:`, err.message);
        allVehicles.push({ connectionId: conn.id, provider: conn.provider, status: 'error', vehicles: [] });
      }
    }

    // Get user's truck profiles for mapping options
    const { data: trucks } = await sb
      .from('entities')
      .select('id, data')
      .eq('user_id', user.id)
      .eq('type', 'Truck');

    const truckProfiles = (trucks || []).map(t => ({
      id: t.id,
      name: t.data?.name || `${t.data?.year || ''} ${t.data?.make || ''} ${t.data?.model || ''}`.trim(),
      year: t.data?.year,
      make: t.data?.make,
      model: t.data?.model,
      vin: t.data?.vin,
    }));

    return res.status(200).json({ providers: allVehicles, truckProfiles });
  } catch (err) {
    console.error('List vehicles error:', err);
    return res.status(500).json({ error: 'Failed to list vehicles' });
  }
}

async function handleMapVehicle(req, res, sb, user) {
  const { connectionId, providerVehicleId, vehicleProfileId } = req.body || {};

  if (!connectionId || !providerVehicleId) {
    return res.status(400).json({ error: 'connectionId and providerVehicleId are required' });
  }

  try {
    // Verify ownership of the connection
    const { data: conn, error: connErr } = await sb
      .from('telematics_connections')
      .select('id, user_id')
      .eq('id', connectionId)
      .eq('user_id', user.id)
      .single();

    if (connErr || !conn) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    // If vehicleProfileId provided, verify ownership of the truck profile
    if (vehicleProfileId) {
      const { data: truck, error: truckErr } = await sb
        .from('entities')
        .select('id')
        .eq('id', vehicleProfileId)
        .eq('user_id', user.id)
        .eq('type', 'Truck')
        .single();

      if (truckErr || !truck) {
        return res.status(404).json({ error: 'Truck profile not found' });
      }
    }

    // Update the mapping
    const { error: updateErr } = await sb
      .from('telematics_connections')
      .update({
        provider_vehicle_id: providerVehicleId,
        vehicle_profile_id: vehicleProfileId || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', connectionId);

    if (updateErr) throw new Error(updateErr.message);

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Map vehicle error:', err);
    return res.status(500).json({ error: 'Failed to map vehicle' });
  }
}

async function handleDisconnect(req, res, sb, user) {
  const provider = req.query.provider;
  if (!provider) {
    return res.status(400).json({ error: 'provider query parameter is required' });
  }

  try {
    const { data: conn } = await sb
      .from('telematics_connections')
      .select('id')
      .eq('user_id', user.id)
      .eq('provider', provider)
      .eq('status', 'active')
      .maybeSingle();

    if (!conn) {
      return res.status(404).json({ error: 'No active connection found for this provider' });
    }

    const { error: updateErr } = await sb
      .from('telematics_connections')
      .update({ status: 'disconnected', updated_at: new Date().toISOString() })
      .eq('id', conn.id);

    if (updateErr) throw new Error(updateErr.message);

    return res.status(200).json({ success: true, provider, status: 'disconnected' });
  } catch (err) {
    console.error('Disconnect provider error:', err);
    return res.status(500).json({ error: 'Failed to disconnect provider' });
  }
}
