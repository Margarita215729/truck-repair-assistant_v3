/**
 * Truck State Snapshot Endpoint
 *
 * GET /api/telematics/truck-state-snapshot?vehicleProfileId=...
 *
 * Authenticated endpoint that:
 * 1. Loads the latest snapshot
 * 2. If stale (>5 min), triggers syncNow → rebuild
 * 3. Runs through Improbability Drive for AI interpretation
 * 4. Returns { snapshot, interpretation, meta }
 */
import { createClient } from '@supabase/supabase-js';
import { loadLatestSnapshot, isSnapshotStale, buildAndPersistSnapshot } from './lib/snapshotBuilder.js';
import { interpret } from './lib/improbabilityDrive.js';

let _supabase;
function getSupabase() {
  if (!_supabase) {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Missing Supabase config');
    _supabase = createClient(url, key);
  }
  return _supabase;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // Auth
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const sb = getSupabase();
    const { data: { user }, error: authErr } = await sb.auth.getUser(token);
    if (authErr || !user) return res.status(401).json({ error: 'Invalid token' });

    let vehicleProfileId = req.query.vehicleProfileId;
    if (vehicleProfileId === '_auto') vehicleProfileId = null;

    // Load active connection
    const { data: connection } = await sb
      .from('telematics_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();

    // Auto-resolve vehicleProfileId from mapped vehicle if not provided
    if (!vehicleProfileId && connection?.provider_vehicle_id) {
      const { data: mapped } = await sb
        .from('vehicle_profiles')
        .select('id')
        .eq('user_id', user.id)
        .eq('telematics_vehicle_id', connection.provider_vehicle_id)
        .limit(1)
        .maybeSingle();
      if (mapped) vehicleProfileId = mapped.id;
    }

    if (!connection) {
      return res.status(200).json({
        snapshot: null,
        interpretation: null,
        meta: { connected: false, message: 'No telematics provider connected' },
      });
    }

    // Load latest snapshot
    let snapshot = await loadLatestSnapshot(user.id, vehicleProfileId);

    // If stale, sync and rebuild
    if (isSnapshotStale(snapshot)) {
      try {
        // Load tokens and sync
        const { loadTokens } = await import('./lib/tokenVault.js');
        const tokens = await loadTokens(connection.token_ref);

        if (tokens?.access_token) {
          const provider = await import(`./lib/providers/${connection.provider}.js`);
          const syncPayload = await provider.syncNow({
            accessToken: tokens.access_token,
            vehicleId: connection.provider_vehicle_id,
          });

          // Persist normalized data from sync
          if (syncPayload.faults?.length || syncPayload.signals?.length) {
            const { normalizeFaultEvents } = await import('./lib/normalizeFaultEvent.js');
            const { normalizeSignalEvents } = await import('./lib/normalizeSignalEvent.js');

            const faults = normalizeFaultEvents(syncPayload.faults);
            const signals = normalizeSignalEvents(syncPayload.signals);

            // Insert raw
            const { data: rawRow } = await sb
              .from('fault_events_raw')
              .insert({
                user_id: user.id,
                provider: connection.provider,
                provider_event_id: `sync_${Date.now()}`,
                signature_valid: true,
                payload_json: syncPayload,
              })
              .select('id')
              .single();

            const rawId = rawRow?.id;

            // Insert faults
            for (const f of faults) {
              await sb.from('fault_events_normalized').upsert(
                {
                  user_id: user.id,
                  vehicle_profile_id: vehicleProfileId,
                  ...f,
                  source_raw_id: rawId,
                },
                { onConflict: 'provider,provider_vehicle_id,dtc,oem_code,spn,fmi,first_seen_at' }
              );
            }

            // Insert signals
            if (signals.length > 0) {
              await sb.from('vehicle_signal_events').insert(
                signals.map(s => ({
                  user_id: user.id,
                  vehicle_profile_id: vehicleProfileId,
                  ...s,
                  source_raw_id: rawId,
                }))
              );
            }
          }
        }
      } catch (syncErr) {
        console.warn('Sync before snapshot failed (continuing with cached):', syncErr.message);
      }

      // Rebuild snapshot regardless (new data or stale data, it's better than nothing)
      try {
        const freshSnapshot = await buildAndPersistSnapshot(user.id, vehicleProfileId, connection);
        snapshot = freshSnapshot;
      } catch (buildErr) {
        console.warn('Snapshot rebuild failed:', buildErr.message);
      }
    }

    if (!snapshot?.snapshot_json) {
      return res.status(200).json({
        snapshot: null,
        interpretation: null,
        meta: {
          connected: true,
          provider: connection.provider,
          message: 'Waiting for telematics data. Events will arrive via webhook.',
        },
      });
    }

    // Run through Improbability Drive
    let interpretation = null;
    try {
      // Get truck context if available
      let truckContext = null;
      const { data: profile } = await sb
        .from('vehicle_profiles')
        .select('make, model, year, vin, engine_type, mileage')
        .eq('id', vehicleProfileId)
        .maybeSingle();

      if (profile) truckContext = profile;

      interpretation = await interpret(snapshot.snapshot_json, truckContext);
    } catch (aiErr) {
      console.warn('Improbability Drive failed (returning raw snapshot):', aiErr.message);
    }

    return res.status(200).json({
      snapshot: snapshot.snapshot_json,
      interpretation,
      meta: {
        connected: true,
        provider: connection.provider,
        built_at: snapshot.built_at,
        snapshot_id: snapshot.id,
        stale: isSnapshotStale(snapshot),
      },
    });
  } catch (err) {
    console.error('Truck state snapshot error:', err);
    return res.status(500).json({ error: 'Failed to load truck state' });
  }
}
