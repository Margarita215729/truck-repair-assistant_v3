/**
 * Geotab Webhook Ingestion Endpoint
 *
 * POST /api/webhooks/geotab
 *
 * Handles incoming Geotab webhooks (if configured via Add-In Data Feed)
 * or synthetic payloads from the feed poller's syncNow.
 *
 * Flow:
 * 1. Read raw body bytes
 * 2. Verify signature (stub — Geotab doesn't natively push webhooks)
 * 3. Insert into fault_events_raw
 * 4. Normalize faults, signals, operational events
 * 5. Upsert normalized rows
 * 6. Rebuild snapshot for affected vehicle
 */
import { createClient } from '@supabase/supabase-js';
import { verifyWebhookSignature, normalizeWebhook } from '../telematics/lib/providers/geotab.js';
import { normalizeFaultEvents } from '../telematics/lib/normalizeFaultEvent.js';
import { normalizeSignalEvents } from '../telematics/lib/normalizeSignalEvent.js';

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

export const config = {
  api: { bodyParser: false },
};

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const sb = getSupabase();

  try {
    // 1. Raw body
    const rawBody = await getRawBody(req);
    const rawString = rawBody.toString('utf8');
    const payload = JSON.parse(rawString);

    // 2. Find connection
    const vehicleId = payload.data?.deviceId || payload.data?.vehicle?.id || null;

    let secret = null;
    let userId = null;
    let connectionRow = null;

    if (vehicleId) {
      const { data: conn } = await sb
        .from('telematics_connections')
        .select('*')
        .eq('provider', 'geotab')
        .eq('provider_vehicle_id', vehicleId)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

      if (conn) {
        connectionRow = conn;
        userId = conn.user_id;
        if (conn.webhook_secret_ref) {
          try {
            const { loadTokens } = await import('../telematics/lib/tokenVault.js');
            const secretData = await loadTokens(conn.webhook_secret_ref);
            secret = secretData?.webhook_secret || null;
          } catch { /* no secret */ }
        }
      }
    }

    // 3. Verify signature (Geotab stub — always false unless Add-In configured)
    const sigValid = secret ? verifyWebhookSignature(rawString, req.headers, secret) : false;

    if (!userId) {
      const { data: anyConn } = await sb
        .from('telematics_connections')
        .select('user_id, id, vehicle_profile_id')
        .eq('provider', 'geotab')
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

      if (anyConn) {
        userId = anyConn.user_id;
        connectionRow = anyConn;
      }
    }

    if (!userId) {
      console.warn('Geotab webhook received but no matching connection found');
      return res.status(200).json({ ok: true, note: 'no_matching_connection' });
    }

    // 4. Insert raw event
    const { data: rawRow } = await sb
      .from('fault_events_raw')
      .insert({
        user_id: userId,
        provider: 'geotab',
        provider_event_id: payload.id || payload.event_id || null,
        signature_valid: sigValid,
        payload_json: payload,
      })
      .select('id')
      .single();

    const rawId = rawRow?.id || null;

    // 5. Normalize
    const normalized = normalizeWebhook(payload);

    // 6. Insert normalized faults
    const faults = normalizeFaultEvents(normalized.faults);
    for (const f of faults) {
      await sb.from('fault_events_normalized').upsert(
        {
          user_id: userId,
          vehicle_profile_id: connectionRow?.vehicle_profile_id || null,
          ...f,
          source_raw_id: rawId,
        },
        { onConflict: 'provider,provider_vehicle_id,dtc,oem_code,spn,fmi,first_seen_at' }
      ).select();
    }

    // 7. Insert normalized signals
    const signals = normalizeSignalEvents(normalized.signals);
    if (signals.length > 0) {
      await sb.from('vehicle_signal_events').insert(
        signals.map(s => ({
          user_id: userId,
          vehicle_profile_id: connectionRow?.vehicle_profile_id || null,
          ...s,
          source_raw_id: rawId,
        }))
      );
    }

    // 8. Insert operational events
    for (const op of (normalized.operationalEvents || [])) {
      await sb.from('vehicle_operational_events').insert({
        user_id: userId,
        vehicle_profile_id: connectionRow?.vehicle_profile_id || null,
        provider: 'geotab',
        provider_vehicle_id: normalized.vehicleId,
        event_type: op.event_type,
        event_payload: op.event_payload || {},
        observed_at: op.observed_at,
        source_raw_id: rawId,
      });
    }

    // 9. Insert defects
    for (const d of (normalized.defects || [])) {
      await sb.from('vehicle_defect_events').insert({
        user_id: userId,
        vehicle_profile_id: connectionRow?.vehicle_profile_id || null,
        provider: 'geotab',
        provider_vehicle_id: normalized.vehicleId,
        defect_type: d.defect_type,
        severity: d.severity,
        status: d.status,
        notes: d.notes,
        reported_at: d.reported_at,
        resolved_at: d.resolved_at,
        source_raw_id: rawId,
      });
    }

    // 10. Trigger snapshot rebuild
    try {
      const { buildAndPersistSnapshot } = await import('../telematics/lib/snapshotBuilder.js');
      buildAndPersistSnapshot(userId, connectionRow?.vehicle_profile_id, connectionRow).catch(
        err => console.error('Snapshot rebuild failed:', err.message)
      );
    } catch (snapErr) {
      console.warn('Snapshot builder not available:', snapErr.message);
    }

    return res.status(200).json({ ok: true, raw_id: rawId });
  } catch (err) {
    console.error('Geotab webhook error:', err);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
}
