/**
 * Motive (KeepTruckin) Provider Adapter
 *
 * Implements the telematics provider interface for Motive API.
 * Docs: https://developer.gomotive.com/docs
 *
 * Motive uses OAuth 2.0. Webhooks may need dashboard-level config.
 */
import crypto from 'node:crypto';
import { CANONICAL_SIGNALS } from '../providerCapabilityMatrix.js';

const MOTIVE_API = 'https://api.gomotive.com/v1';

// ─── Webhook Signature ───────────────────────────────────────────────

/**
 * Verify Motive webhook HMAC-SHA256 signature.
 * Motive sends signature in `X-Webhook-Signature` header.
 */
export function verifyWebhookSignature(rawBody, headers, secret) {
  const sig = headers['x-webhook-signature'] || headers['X-Webhook-Signature'];
  if (!sig || !secret) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}

// ─── Webhook Normalization ───────────────────────────────────────────

/**
 * Normalize a Motive webhook payload into our internal event format.
 * Returns { faults: [], signals: [], operationalEvents: [], vehicleId, timestamp }
 */
export function normalizeWebhook(payload) {
  const result = { faults: [], signals: [], operationalEvents: [], defects: [] };
  const eventType = payload.event_type || payload.type || '';
  const data = payload.data || payload.attributes || payload;

  // Vehicle identification
  const vehicle = data.vehicle || {};
  result.vehicleId = vehicle.id || data.vehicle_id || null;
  result.timestamp = data.occurred_at || data.timestamp || data.created_at || new Date().toISOString();

  // Fault code events
  if (eventType.includes('fault') || eventType.includes('diagnostic') || data.fault_codes || data.dtcs) {
    const codes = data.fault_codes || data.dtcs || data.diagnostic_trouble_codes || [];
    for (const fc of (Array.isArray(codes) ? codes : [codes])) {
      result.faults.push({
        provider: 'motive',
        provider_vehicle_id: result.vehicleId,
        spn: fc.spn ?? null,
        fmi: fc.fmi ?? null,
        dtc: fc.code || fc.dtc_code || fc.dtc || null,
        oem_code: fc.oem_code || null,
        description: fc.description || fc.fault_description || null,
        status: fc.cleared === true || fc.status === 'inactive' ? 'cleared' : 'active',
        source_address: fc.source_address || fc.ecu || null,
        first_seen_at: fc.first_observed_at || fc.first_seen_at || result.timestamp,
        last_seen_at: fc.last_observed_at || fc.last_seen_at || result.timestamp,
        observed_at: result.timestamp,
        occurrence_count: fc.count || null,
        lamp_status: {
          mil: fc.mil_status ?? null,
          stop: fc.stop_lamp ?? null,
          warning: fc.warning_lamp ?? null,
          protect: fc.protect_lamp ?? null,
        },
      });
    }
  }

  // Vehicle stats / signals
  const stats = data.vehicle_stats || data.stats || data;
  if (stats && typeof stats === 'object') {
    const ts = result.timestamp;
    const push = (name, numVal, textVal, boolVal) => {
      if (numVal == null && textVal == null && boolVal == null) return;
      const meta = CANONICAL_SIGNALS[name] || {};
      result.signals.push({
        provider: 'motive',
        provider_vehicle_id: result.vehicleId,
        signal_name: name,
        numeric_value: numVal ?? null,
        text_value: textVal ?? null,
        bool_value: boolVal ?? null,
        unit: meta.unit || null,
        observed_at: ts,
      });
    };

    push('engine_state', null, stats.engine_state || stats.engineState || null, null);
    push('engine_rpm', stats.engine_rpm ?? stats.rpm ?? null, null, null);
    push('engine_load_pct', stats.engine_load ?? stats.engine_load_percent ?? null, null, null);
    push('engine_coolant_temp_c', stats.coolant_temperature ?? stats.engine_coolant_temp ?? null, null, null);
    push('engine_oil_pressure_kpa', stats.oil_pressure ?? stats.engine_oil_pressure ?? null, null, null);
    push('battery_voltage', stats.battery_voltage ?? stats.voltage ?? null, null, null);
    push('fuel_pct', stats.fuel_level ?? stats.fuel_percent ?? null, null, null);
    push('def_level_pct', stats.def_level ?? stats.def_level_percent ?? null, null, null);
    push('odometer_meters', stats.odometer ? stats.odometer * 1609.34 : (stats.odometer_meters ?? null), null, null); // Motive may report miles
    push('engine_seconds', stats.engine_hours ? stats.engine_hours * 3600 : (stats.engine_seconds ?? null), null, null);
    push('speed_mph', stats.speed ?? stats.vehicle_speed ?? null, null, null);
    push('heading_deg', stats.bearing ?? stats.heading ?? null, null, null);
    push('latitude', stats.latitude ?? stats.lat ?? null, null, null);
    push('longitude', stats.longitude ?? stats.lng ?? stats.lon ?? null, null, null);
    push('ambient_air_temp_c', stats.ambient_temperature ?? null, null, null);
    push('gateway_connected', null, null, stats.gateway_connected ?? stats.eld_connected ?? null);
  }

  // Tell-tales (Motive has partial coverage)
  if (data.indicators || data.warning_indicators) {
    const ind = data.indicators || data.warning_indicators || {};
    const ts = result.timestamp;
    const pushTT = (name, val) => {
      if (val == null) return;
      result.signals.push({
        provider: 'motive',
        provider_vehicle_id: result.vehicleId,
        signal_name: name,
        numeric_value: null,
        text_value: typeof val === 'string' ? val : (val ? 'on' : 'off'),
        bool_value: null,
        unit: null,
        observed_at: ts,
      });
    };
    pushTT('tell_tale_mil', ind.mil ?? ind.check_engine ?? null);
    pushTT('tell_tale_stop_lamp', ind.stop_lamp ?? ind.stop ?? null);
    pushTT('tell_tale_warning_lamp', ind.warning_lamp ?? ind.warning ?? null);
    pushTT('tell_tale_protect_lamp', ind.protect_lamp ?? null);
  }

  // Operational events
  if (eventType.includes('trip_start') || eventType === 'driving_started') {
    result.operationalEvents.push({ event_type: 'trip_started', event_payload: data, observed_at: result.timestamp });
  }
  if (eventType.includes('trip_end') || eventType === 'driving_stopped') {
    result.operationalEvents.push({ event_type: 'trip_ended', event_payload: data, observed_at: result.timestamp });
  }
  if (eventType.includes('disconnect') || eventType.includes('gateway_offline')) {
    result.operationalEvents.push({ event_type: 'gateway_disconnected', event_payload: data, observed_at: result.timestamp });
  }
  if (eventType.includes('reconnect') || eventType.includes('gateway_online')) {
    result.operationalEvents.push({ event_type: 'gateway_reconnected', event_payload: data, observed_at: result.timestamp });
  }

  // DVIR / defects if present
  if (data.defects || data.dvir_defects) {
    const defects = data.defects || data.dvir_defects || [];
    for (const d of (Array.isArray(defects) ? defects : [defects])) {
      result.defects.push({
        defect_type: d.defect_type || d.category || 'unknown',
        severity: d.severity || 'unknown',
        status: d.resolved ? 'resolved' : 'open',
        notes: d.notes || d.comment || null,
        reported_at: d.reported_at || result.timestamp,
        resolved_at: d.resolved_at || null,
      });
    }
  }

  return result;
}

// ─── REST API Calls ─────────────────────────────────────────────────

async function motiveFetch(path, accessToken, opts = {}) {
  const url = `${MOTIVE_API}${path}`;
  const res = await fetch(url, {
    ...opts,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Motive API ${res.status}: ${text}`);
  }
  return res.json();
}

/** Fetch all vehicles. */
export async function fetchVehicles({ accessToken }) {
  const resp = await motiveFetch('/vehicles', accessToken);
  return (resp.vehicles || resp.data || []).map(v => ({
    id: v.id || v.vehicle_id,
    name: v.number || v.name || `Vehicle ${v.id}`,
    vin: v.vin || null,
    make: v.make || null,
    model: v.model || null,
    year: v.year || null,
    serial: null,
  }));
}

/** Fetch current vehicle stats. */
export async function fetchCurrentSignals({ accessToken, providerVehicleId }) {
  const resp = await motiveFetch(
    `/vehicles/${providerVehicleId}/stats/feed`,
    accessToken
  );
  return resp.data || resp.stats || resp;
}

/** Fetch current fault codes. */
export async function fetchCurrentFaults({ accessToken, providerVehicleId }) {
  const resp = await motiveFetch(
    `/vehicles/${providerVehicleId}/faults`,
    accessToken
  );
  return resp.faults || resp.data || resp.fault_codes || [];
}

/** Fetch current location. */
export async function fetchCurrentLocation({ accessToken, providerVehicleId }) {
  const resp = await motiveFetch(
    `/vehicles/${providerVehicleId}/locations/current`,
    accessToken
  );
  const loc = resp.location || resp.data || resp;
  if (!loc) return null;
  return {
    latitude: loc.latitude ?? loc.lat,
    longitude: loc.longitude ?? loc.lng ?? loc.lon,
    speed: loc.speed ?? loc.vehicle_speed,
    heading: loc.bearing ?? loc.heading,
    time: loc.located_at || loc.time,
  };
}

/** Fetch DVIR / inspection defects. */
export async function fetchInspectionDefects({ accessToken, providerVehicleId }) {
  try {
    const resp = await motiveFetch(
      `/vehicles/${providerVehicleId}/dvirs?limit=25`,
      accessToken
    );
    return (resp.dvirs || resp.data || []).flatMap(dvir =>
      (dvir.defects || []).map(d => ({
        defect_type: d.defect_type || d.category || 'unknown',
        severity: d.severity || 'unknown',
        status: d.resolved ? 'resolved' : 'open',
        notes: d.notes || null,
        reported_at: dvir.inspection_date || dvir.created_at,
        resolved_at: d.resolved_at || null,
      }))
    );
  } catch {
    return [];
  }
}

/** Fetch gateway / ELD connection status. */
export async function fetchGatewayStatus({ accessToken, providerVehicleId }) {
  try {
    const resp = await motiveFetch(
      `/vehicles/${providerVehicleId}`,
      accessToken
    );
    const v = resp.vehicle || resp.data || {};
    return {
      connected: v.eld_connection === 'connected' || v.gateway_connected === true,
      lastSeen: v.last_reported_at || null,
    };
  } catch {
    return { connected: null, lastSeen: null };
  }
}

/**
 * Full "sync now" for Motive.
 */
export async function syncNow({ accessToken, providerVehicleId }) {
  const [faults, stats, location, defects, gateway] = await Promise.all([
    fetchCurrentFaults({ accessToken, providerVehicleId }).catch(() => []),
    fetchCurrentSignals({ accessToken, providerVehicleId }).catch(() => ({})),
    fetchCurrentLocation({ accessToken, providerVehicleId }).catch(() => null),
    fetchInspectionDefects({ accessToken, providerVehicleId }).catch(() => []),
    fetchGatewayStatus({ accessToken, providerVehicleId }).catch(() => ({ connected: null })),
  ]);

  const syntheticPayload = {
    event_type: 'sync_now',
    data: {
      vehicle: { id: providerVehicleId },
      fault_codes: faults,
      vehicle_stats: stats,
      latitude: location?.latitude,
      longitude: location?.longitude,
      speed: location?.speed,
      bearing: location?.heading,
      gateway_connected: gateway.connected,
      occurred_at: new Date().toISOString(),
    },
  };

  const normalized = normalizeWebhook(syntheticPayload);
  normalized.defects = defects;
  return normalized;
}

/**
 * Motive does not support programmatic webhook registration.
 * Webhooks must be configured via the Motive Dashboard.
 */
export async function registerWebhooks() {
  throw new Error('Motive webhook registration requires dashboard configuration. See https://developer.gomotive.com/docs/webhooks');
}
