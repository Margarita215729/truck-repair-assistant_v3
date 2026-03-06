/**
 * Samsara Provider Adapter
 *
 * Implements the telematics provider interface for Samsara Fleet API.
 * Docs: https://developers.samsara.com/docs
 *
 * Samsara uses OAuth 2.0 with refresh tokens.
 * Webhooks deliver fault codes, vehicle stats, and operational events.
 */
import crypto from 'node:crypto';
import { CANONICAL_SIGNALS } from '../providerCapabilityMatrix.js';

const SAMSARA_API = 'https://api.samsara.com';

// ─── Webhook Signature ───────────────────────────────────────────────

/**
 * Verify Samsara webhook HMAC-SHA256 signature.
 * Samsara sends the signature in the `X-Samsara-Hmac-Sha256` header.
 */
export function verifyWebhookSignature(rawBody, headers, secret) {
  const sig = headers['x-samsara-hmac-sha256'] || headers['X-Samsara-Hmac-Sha256'];
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
 * Normalize a Samsara webhook payload into our internal event format.
 * Samsara webhooks have an `eventType` and `data` field.
 *
 * Returns { faults: [], signals: [], operationalEvents: [], vehicleId, timestamp }
 */
export function normalizeWebhook(payload) {
  const result = { faults: [], signals: [], operationalEvents: [], defects: [] };
  const eventType = payload.eventType || payload.event_type || '';
  const data = payload.data || payload;

  // Vehicle identification
  const vehicle = data.vehicle || data.asset || {};
  result.vehicleId = vehicle.id || data.vehicleId || data.vehicle_id || null;
  result.timestamp = data.time || data.happenedAtTime || data.timestamp || new Date().toISOString();

  // Fault code events
  if (eventType.includes('FaultCode') || data.faultCodes || data.diagnosticTroubleCodes) {
    const codes = data.faultCodes || data.diagnosticTroubleCodes || [];
    for (const fc of (Array.isArray(codes) ? codes : [codes])) {
      result.faults.push({
        provider: 'samsara',
        provider_vehicle_id: result.vehicleId,
        spn: fc.spnId ?? fc.spn ?? null,
        fmi: fc.fmiId ?? fc.fmi ?? null,
        dtc: fc.dtcShortCode || fc.dtc || null,
        oem_code: fc.txId || fc.oemCode || null,
        description: fc.description || fc.spnDescription || null,
        status: fc.isActive === false ? 'cleared' : 'active',
        source_address: fc.sourceAddress || fc.ecuAddress || null,
        first_seen_at: fc.firstObservedAtTime || fc.firstSeenAt || result.timestamp,
        last_seen_at: fc.lastObservedAtTime || fc.lastSeenAt || result.timestamp,
        observed_at: result.timestamp,
        occurrence_count: fc.occurrenceCount || null,
        lamp_status: {
          mil: fc.checkEngineLightIsOn ?? null,
          stop: fc.stopLampIsOn ?? null,
          warning: fc.warningLampIsOn ?? null,
          protect: fc.protectLampIsOn ?? null,
        },
      });
    }
  }

  // Vehicle stats / signals
  if (data.engineState || data.obdEngineSeconds || data.gps || data.fuelPercent != null || data.engineRpm != null) {
    const ts = result.timestamp;
    const push = (name, numVal, textVal, boolVal) => {
      if (numVal == null && textVal == null && boolVal == null) return;
      const meta = CANONICAL_SIGNALS[name] || {};
      result.signals.push({
        provider: 'samsara',
        provider_vehicle_id: result.vehicleId,
        signal_name: name,
        numeric_value: numVal ?? null,
        text_value: textVal ?? null,
        bool_value: boolVal ?? null,
        unit: meta.unit || null,
        observed_at: ts,
      });
    };

    push('engine_state', null, data.engineState?.value || data.engineState || null, null);
    push('engine_rpm', data.engineRpm?.value ?? data.engineRpm ?? null, null, null);
    push('engine_load_pct', data.engineLoadPercent?.value ?? data.engineLoadPercent ?? null, null, null);
    push('engine_coolant_temp_c', data.engineCoolantTemperatureMilliC != null ? data.engineCoolantTemperatureMilliC / 1000 : (data.engineCoolantTemp ?? null), null, null);
    push('engine_oil_pressure_kpa', data.engineOilPressureKPa?.value ?? data.engineOilPressureKPa ?? null, null, null);
    push('battery_voltage', data.batteryMilliVolts != null ? data.batteryMilliVolts / 1000 : (data.batteryVoltage ?? null), null, null);
    push('fuel_pct', data.fuelPercent?.value ?? data.fuelPercent ?? null, null, null);
    push('def_level_pct', data.defLevelPercent?.value ?? data.defLevelPercent ?? null, null, null);
    push('odometer_meters', data.obdOdometerMeters?.value ?? data.obdOdometerMeters ?? null, null, null);
    push('engine_seconds', data.obdEngineSeconds?.value ?? data.obdEngineSeconds ?? null, null, null);
    push('speed_mph', data.gps?.speedMilesPerHour ?? data.speedMph ?? null, null, null);
    push('heading_deg', data.gps?.headingDegrees ?? data.heading ?? null, null, null);
    push('latitude', data.gps?.latitude ?? null, null, null);
    push('longitude', data.gps?.longitude ?? null, null, null);
    push('ambient_air_temp_c', data.ambientAirTemperatureMilliC != null ? data.ambientAirTemperatureMilliC / 1000 : null, null, null);
    push('intake_manifold_temp_c', data.intakeManifoldTemperatureMilliC != null ? data.intakeManifoldTemperatureMilliC / 1000 : null, null, null);
    push('gateway_connected', null, null, data.gatewayConnected ?? data.isConnected ?? null);
  }

  // Tell-tales (may come in fault data or dedicated fields)
  if (data.indicators || data.tellTales) {
    const ind = data.indicators || data.tellTales || {};
    const ts = result.timestamp;
    const pushTT = (name, val) => {
      if (val == null) return;
      result.signals.push({
        provider: 'samsara',
        provider_vehicle_id: result.vehicleId,
        signal_name: name,
        numeric_value: null,
        text_value: typeof val === 'string' ? val : (val ? 'on' : 'off'),
        bool_value: null,
        unit: null,
        observed_at: ts,
      });
    };
    pushTT('tell_tale_mil', ind.mil ?? ind.checkEngineLamp ?? null);
    pushTT('tell_tale_stop_lamp', ind.stopLamp ?? ind.stop ?? null);
    pushTT('tell_tale_warning_lamp', ind.warningLamp ?? ind.warning ?? null);
    pushTT('tell_tale_protect_lamp', ind.protectLamp ?? ind.protect ?? null);
  }

  // Operational events
  if (eventType.includes('TripStart') || eventType.includes('trip_start')) {
    result.operationalEvents.push({ event_type: 'trip_started', event_payload: data, observed_at: result.timestamp });
  }
  if (eventType.includes('TripEnd') || eventType.includes('trip_end')) {
    result.operationalEvents.push({ event_type: 'trip_ended', event_payload: data, observed_at: result.timestamp });
  }
  if (eventType.includes('GatewayDisconnect')) {
    result.operationalEvents.push({ event_type: 'gateway_disconnected', event_payload: data, observed_at: result.timestamp });
  }
  if (eventType.includes('GatewayConnect') || eventType.includes('GatewayReconnect')) {
    result.operationalEvents.push({ event_type: 'gateway_reconnected', event_payload: data, observed_at: result.timestamp });
  }

  return result;
}

// ─── REST API Calls ─────────────────────────────────────────────────

async function samsaraFetch(path, accessToken, opts = {}) {
  const url = `${SAMSARA_API}${path}`;
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
    throw new Error(`Samsara API ${res.status}: ${text}`);
  }
  return res.json();
}

/** Fetch all vehicles visible to the authenticated org. */
export async function fetchVehicles({ accessToken }) {
  const resp = await samsaraFetch('/fleet/vehicles', accessToken);
  return (resp.data || []).map(v => ({
    id: v.id,
    name: v.name,
    vin: v.vin || null,
    make: v.make || null,
    model: v.model || null,
    year: v.year || null,
    serial: v.serial || null,
  }));
}

/** Fetch current vehicle stats (signals). */
export async function fetchCurrentSignals({ accessToken, providerVehicleId }) {
  const types = [
    'engineStates', 'engineRpm', 'engineLoadPercent',
    'batteryMilliVolts', 'engineCoolantTemperatureMilliC',
    'engineOilPressureKPa', 'fuelPercents', 'defLevelPercent',
    'obdOdometerMeters', 'obdEngineSeconds', 'gps',
    'ambientAirTemperatureMilliC', 'intakeManifoldTemperatureMilliC',
  ].join(',');
  const resp = await samsaraFetch(
    `/fleet/vehicles/stats?vehicleIds=${providerVehicleId}&types=${types}`,
    accessToken
  );
  return resp.data || [];
}

/** Fetch current fault codes. */
export async function fetchCurrentFaults({ accessToken, providerVehicleId }) {
  const resp = await samsaraFetch(
    `/fleet/vehicles/${providerVehicleId}/safety/faultCodes`,
    accessToken
  );
  return resp.data || resp.faultCodes || [];
}

/** Fetch current GPS location. */
export async function fetchCurrentLocation({ accessToken, providerVehicleId }) {
  const resp = await samsaraFetch(
    `/fleet/vehicles/locations?vehicleIds=${providerVehicleId}`,
    accessToken
  );
  const loc = (resp.data || [])[0];
  if (!loc) return null;
  return {
    latitude: loc.latitude ?? loc.gps?.latitude,
    longitude: loc.longitude ?? loc.gps?.longitude,
    speed: loc.speed ?? loc.gps?.speedMilesPerHour,
    heading: loc.heading ?? loc.gps?.headingDegrees,
    time: loc.time,
  };
}

/** Fetch DVIR / inspection defects. */
export async function fetchInspectionDefects({ accessToken, providerVehicleId }) {
  try {
    const resp = await samsaraFetch(
      `/fleet/dvirs?vehicleIds=${providerVehicleId}&limit=25`,
      accessToken
    );
    return (resp.data || []).flatMap(dvir =>
      (dvir.defects || []).map(d => ({
        defect_type: d.defectType || d.type || 'unknown',
        severity: d.severity || 'unknown',
        status: d.isResolved ? 'resolved' : 'open',
        notes: d.comment || d.notes || null,
        reported_at: dvir.inspectionTime || dvir.time,
        resolved_at: d.resolvedAt || null,
      }))
    );
  } catch {
    return [];
  }
}

/** Fetch gateway connection status. */
export async function fetchGatewayStatus({ accessToken, providerVehicleId }) {
  try {
    const resp = await samsaraFetch(
      `/fleet/vehicles/stats?vehicleIds=${providerVehicleId}&types=gateways`,
      accessToken
    );
    const gw = (resp.data || [])[0];
    return {
      connected: gw?.gateways?.[0]?.connectionStatus === 'connected',
      lastSeen: gw?.gateways?.[0]?.lastSeenAtTime || null,
    };
  } catch {
    return { connected: null, lastSeen: null };
  }
}

/**
 * Full "sync now" — pull current faults + signals + location + defects.
 * Returns data in normalizeWebhook-compatible shape.
 */
export async function syncNow({ accessToken, providerVehicleId }) {
  const [faults, statsArr, location, defects, gateway] = await Promise.all([
    fetchCurrentFaults({ accessToken, providerVehicleId }).catch(() => []),
    fetchCurrentSignals({ accessToken, providerVehicleId }).catch(() => []),
    fetchCurrentLocation({ accessToken, providerVehicleId }).catch(() => null),
    fetchInspectionDefects({ accessToken, providerVehicleId }).catch(() => []),
    fetchGatewayStatus({ accessToken, providerVehicleId }).catch(() => ({ connected: null })),
  ]);

  // Build a synthetic webhook-like payload so normalizeWebhook can parse it
  const syntheticPayload = {
    eventType: 'SyncNow',
    data: {
      vehicle: { id: providerVehicleId },
      faultCodes: faults,
      ...(statsArr[0] || {}),
      gps: location ? { latitude: location.latitude, longitude: location.longitude, speedMilesPerHour: location.speed, headingDegrees: location.heading } : undefined,
      gatewayConnected: gateway.connected,
      time: new Date().toISOString(),
    },
  };

  const normalized = normalizeWebhook(syntheticPayload);
  normalized.defects = defects;
  return normalized;
}

/**
 * Register a webhook endpoint with Samsara.
 * Requires the org to have webhook management permissions.
 */
export async function registerWebhooks({ accessToken, callbackUrl, secret }) {
  const resp = await samsaraFetch('/webhooks', accessToken, {
    method: 'POST',
    body: JSON.stringify({
      name: 'TRA Telematics Ingestion',
      url: callbackUrl,
      secret,
      eventTypes: [
        'VehicleFaultCodeOnCreate',
        'VehicleFaultCodeOnResolve',
        'VehicleStatsOnUpdate',
        'TripStart',
        'TripEnd',
        'GatewayDisconnect',
        'GatewayReconnect',
      ],
    }),
  });
  return resp.data || resp;
}
