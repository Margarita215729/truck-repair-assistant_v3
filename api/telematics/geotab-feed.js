/**
 * Geotab Feed Poller — Cron-based incremental data ingestion
 *
 * GET /api/telematics/geotab-feed
 *
 * Designed to be called as a Vercel Cron job every 15 minutes.
 * For each active Geotab connection:
 *   1. Load credentials from TokenVault
 *   2. Call GetFeed for FaultData and StatusData
 *   3. Normalize returned records
 *   4. Insert into fault_events_raw / fault_events_normalized / vehicle_signal_events
 *   5. Update feed tokens (toVersion) in connection metadata
 *   6. Trigger snapshot rebuild
 *
 * Cron: vercel.json - every 15 minutes
 */
import { createClient } from '@supabase/supabase-js';
import { loadTokens, updateTokens } from './lib/tokenVault.js';

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase config');
  return createClient(url, key);
}

function verifyCronAuth(req) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;
  const authHeader = req.headers?.authorization || '';
  return authHeader === `Bearer ${cronSecret}`;
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!verifyCronAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const sb = getSupabase();

  try {
    // Find all active Geotab connections
    const { data: connections, error: queryErr } = await sb
      .from('telematics_connections')
      .select('id, user_id, provider, token_ref, provider_vehicle_id, vehicle_profile_id, metadata')
      .eq('provider', 'geotab')
      .eq('status', 'active')
      .not('token_ref', 'is', null);

    if (queryErr) throw new Error(`Query failed: ${queryErr.message}`);

    if (!connections || connections.length === 0) {
      return res.status(200).json({ processed: 0, message: 'No active Geotab connections' });
    }

    const { getFeed, normalizeWebhook } = await import('./lib/providers/geotab.js');
    const { normalizeFaultEvents } = await import('./lib/normalizeFaultEvent.js');
    const { normalizeSignalEvents } = await import('./lib/normalizeSignalEvent.js');

    const results = [];

    for (const conn of connections) {
      try {
        const tokenData = await loadTokens(conn.token_ref);
        if (!tokenData) {
          results.push({ id: conn.id, status: 'skipped', reason: 'no_token_data' });
          continue;
        }

        const metadata = conn.metadata || {};
        let faultVersion = metadata.geotab_fault_feed_version || null;
        let statusVersion = metadata.geotab_status_feed_version || null;
        let totalRecords = 0;

        // ── Poll FaultData feed ──────────────────────────────
        const faultFeed = await getFeed({
          tokenData,
          typeName: 'FaultData',
          fromVersion: faultVersion,
        });

        if (faultFeed.data.length > 0) {
          const faultPayload = {
            data: {
              deviceId: conn.provider_vehicle_id,
              timestamp: new Date().toISOString(),
              faultData: faultFeed.data,
            },
          };

          const normalizedFaults = normalizeWebhook(faultPayload);

          // Insert raw event
          const { data: rawRow } = await sb
            .from('fault_events_raw')
            .insert({
              user_id: conn.user_id,
              provider: 'geotab',
              provider_event_id: `feed-fault-${Date.now()}`,
              signature_valid: true,
              payload_json: { source: 'geotab_feed', record_count: faultFeed.data.length },
            })
            .select('id')
            .single();

          const rawId = rawRow?.id || null;

          // Insert normalized faults
          const faults = normalizeFaultEvents(normalizedFaults.faults);
          for (const f of faults) {
            await sb.from('fault_events_normalized').upsert(
              {
                user_id: conn.user_id,
                vehicle_profile_id: conn.vehicle_profile_id || null,
                ...f,
                source_raw_id: rawId,
              },
              { onConflict: 'provider,provider_vehicle_id,dtc,oem_code,spn,fmi,first_seen_at' }
            );
          }

          // Insert tell-tale signals from fault lamp states
          const signals = normalizeSignalEvents(normalizedFaults.signals);
          if (signals.length > 0) {
            await sb.from('vehicle_signal_events').insert(
              signals.map(s => ({
                user_id: conn.user_id,
                vehicle_profile_id: conn.vehicle_profile_id || null,
                ...s,
                source_raw_id: rawId,
              }))
            );
          }

          totalRecords += faultFeed.data.length;
        }

        faultVersion = faultFeed.toVersion || faultVersion;

        // ── Poll StatusData feed ─────────────────────────────
        const statusFeed = await getFeed({
          tokenData,
          typeName: 'StatusData',
          fromVersion: statusVersion,
        });

        if (statusFeed.data.length > 0) {
          const statusPayload = {
            data: {
              deviceId: conn.provider_vehicle_id,
              timestamp: new Date().toISOString(),
              statusData: statusFeed.data,
            },
          };

          const normalizedSignals = normalizeWebhook(statusPayload);

          const { data: rawRow } = await sb
            .from('fault_events_raw')
            .insert({
              user_id: conn.user_id,
              provider: 'geotab',
              provider_event_id: `feed-status-${Date.now()}`,
              signature_valid: true,
              payload_json: { source: 'geotab_feed', record_count: statusFeed.data.length },
            })
            .select('id')
            .single();

          const rawId = rawRow?.id || null;

          const signals = normalizeSignalEvents(normalizedSignals.signals);
          if (signals.length > 0) {
            await sb.from('vehicle_signal_events').insert(
              signals.map(s => ({
                user_id: conn.user_id,
                vehicle_profile_id: conn.vehicle_profile_id || null,
                ...s,
                source_raw_id: rawId,
              }))
            );
          }

          totalRecords += statusFeed.data.length;
        }

        statusVersion = statusFeed.toVersion || statusVersion;

        // ── Update feed tokens in connection metadata ────────
        const updatedMetadata = {
          ...metadata,
          geotab_fault_feed_version: faultVersion,
          geotab_status_feed_version: statusVersion,
          last_feed_poll: new Date().toISOString(),
        };

        await sb
          .from('telematics_connections')
          .update({ metadata: updatedMetadata, updated_at: new Date().toISOString() })
          .eq('id', conn.id);

        // ── Update tokenVault if sessionId was refreshed ─────
        if (tokenData.sessionId) {
          await updateTokens(conn.token_ref, tokenData);
        }

        // ── Trigger snapshot rebuild ─────────────────────────
        if (totalRecords > 0) {
          try {
            const { buildAndPersistSnapshot } = await import('./lib/snapshotBuilder.js');
            buildAndPersistSnapshot(conn.user_id, conn.vehicle_profile_id, conn).catch(
              err => console.error('Snapshot rebuild failed:', err.message)
            );
          } catch (snapErr) {
            console.warn('Snapshot builder not available:', snapErr.message);
          }
        }

        results.push({
          id: conn.id,
          status: 'ok',
          faults_polled: faultFeed.data.length,
          signals_polled: statusFeed.data.length,
          total_records: totalRecords,
        });
      } catch (connErr) {
        console.error(`Geotab feed error for connection ${conn.id}:`, connErr.message);

        // Mark as needs_reauth if auth failure
        if (connErr.message.includes('InvalidUserException') || connErr.message.includes('auth')) {
          await sb
            .from('telematics_connections')
            .update({ status: 'needs_reauth', updated_at: new Date().toISOString() })
            .eq('id', conn.id);
        }

        results.push({ id: conn.id, status: 'error', reason: connErr.message });
      }
    }

    const ok = results.filter(r => r.status === 'ok').length;
    const errors = results.filter(r => r.status === 'error').length;

    return res.status(200).json({
      processed: connections.length,
      ok,
      errors,
      results,
    });
  } catch (err) {
    console.error('Geotab feed cron error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
