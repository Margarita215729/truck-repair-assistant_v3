/**
 * Omnitracs (Solera / XRS) Provider Adapter
 *
 * Implements the telematics provider interface for Omnitracs REST API.
 *
 * ⚠ API ACCESS: Omnitracs developer portal (Solera/XRS) is partner-gated
 *   and returned 404 at the time of implementation. This adapter is
 *   structurally complete and follows the known XRS REST API patterns.
 *   Field mappings may require adjustment once real API access is granted.
 *
 * Auth: username + password -> POST /integration/v1/login -> Bearer token
 * Docs: Omnitracs REST Web Services OpenAPI (Roadnet integration docs)
 */
import crypto from 'node:crypto';
import { CANONICAL_SIGNALS } from '../providerCapabilityMatrix.js';

const DEFAULT_OMNITRACS_BASE_URL = 'https://apex-prod-integration.aws.roadnet.com/integration/v1';

function resolveBaseUrl(baseUrl) {
  const resolved = baseUrl || process.env.OMNITRACS_BASE_URL || DEFAULT_OMNITRACS_BASE_URL;
  return String(resolved).replace(/\/+$/, '');
}

// ─── Authentication ──────────────────────────────────────────────────

/**
 * Authenticate with Omnitracs using /login (username/password).
 *
 * @param {string} username
 * @param {string} password
 * @param {string} [baseUrl] - Optional base URL (defaults to OMNITRACS_BASE_URL env)
 * @returns {{ access_token, expires_at, customer_identifier, base_url }}
 */
export async function authenticate(username, password, baseUrl) {
  const apiBase = resolveBaseUrl(baseUrl);
  const resp = await fetch(`${apiBase}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/plain; q=0.9, text/html;q=0.8',
    },
    body: JSON.stringify({ username, password }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Omnitracs /login failed (${resp.status}): ${text}`);
  }

  const data = await resp.json();
  const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
  return {
    access_token: data.token,
    customer_identifier: data.customerIdentifier || null,
    expires_at: expiresAt,
    token_type: 'Bearer',
    base_url: apiBase,
  };
}

// ─── API Helper ──────────────────────────────────────────────────────

async function omnitracsFetch(path, tokenData, opts = {}) {
  const accessToken = tokenData?.access_token || tokenData?.accessToken;
  const baseUrl = resolveBaseUrl(tokenData?.base_url || tokenData?.baseUrl);
  if (!accessToken) throw new Error('Missing Omnitracs access token');

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${baseUrl}${normalizedPath}`;
  const resp = await fetch(url, {
    ...opts,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Omnitracs API ${resp.status}: ${text}`);
  }
  return resp.json();
}

// ─── Webhook Signature ───────────────────────────────────────────────

/**
 * Verify Omnitracs webhook signature.
 * Uses HMAC-SHA256 in the X-Omnitracs-Signature header.
 */
export function verifyWebhookSignature(rawBody, headers, secret) {
  const sig = headers['x-omnitracs-signature'] || headers['X-Omnitracs-Signature'];
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
 * Normalize an Omnitracs payload into our internal event format.
 * Returns { faults: [], signals: [], operationalEvents: [], defects: [], vehicleId, timestamp }
 */
export function normalizeWebhook(payload) {
  const result = { faults: [], signals: [], operationalEvents: [], defects: [] };
  const data = payload.data || payload.attributes || payload;
  const vehicle = data.vehicle || {};

  result.vehicleId = vehicle.id || data.vehicleId || data.vehicle_id || data.unitId || null;
  result.timestamp = data.timestamp || data.dateTime || data.eventTime || new Date().toISOString();

  // ── Fault Codes ────────────────────────────────────────────
  const dtcs = data.diagnostics || data.faults || data.dtcs || [];
  for (const fc of (Array.isArray(dtcs) ? dtcs : [dtcs])) {
    if (!fc) continue;
    result.faults.push({
      provider: 'omnitracs',
      provider_vehicle_id: result.vehicleId,
      spn: fc.spn ?? null,
      fmi: fc.fmi ?? null,
      dtc: fc.code || fc.dtcCode || null,
      oem_code: fc.oemCode || null,
      description: fc.description || fc.faultDescription || null,
      status: fc.status === 'inactive' || fc.cleared ? 'cleared' : 'active',
      source_address: fc.sourceAddress || fc.ecu || null,
      first_seen_at: fc.firstSeen || fc.firstDetected || result.timestamp,
      last_seen_at: fc.lastSeen || result.timestamp,
      observed_at: result.timestamp,
      occurrence_count: fc.count || null,
      lamp_status: {
        mil: fc.milStatus ?? fc.checkEngine ?? null,
        stop: fc.stopLamp ?? null,
        warning: fc.warningLamp ?? null,
        protect: fc.protectLamp ?? null,
      },
    });
  }

  // ── Vehicle Signals / Engine Data ──────────────────────────
  const stats = data.engineData || data.vehicleStats || data.stats || data;
  if (stats && typeof stats === 'object') {
    const ts = result.timestamp;
    const push = (name, numVal, textVal, boolVal) => {
      if (numVal == null && textVal == null && boolVal == null) return;
      const meta = CANONICAL_SIGNALS[name] || {};
      result.signals.push({
        provider: 'omnitracs',
        provider_vehicle_id: result.vehicleId,
        signal_name: name,
        numeric_value: numVal ?? null,
        text_value: textVal ?? null,
        bool_value: boolVal ?? null,
        unit: meta.unit || null,
        observed_at: ts,
      });
    };

    // Engine core
    push('engine_state', null, stats.engineState || stats.engine_state || null, null);
    push('engine_rpm', stats.engineRpm ?? stats.rpm ?? null, null, null);
    push('engine_load_pct', stats.engineLoad ?? stats.engineLoadPercent ?? null, null, null);
    push('engine_coolant_temp_c', stats.coolantTemp ?? stats.engineCoolantTemp ?? null, null, null);
    push('engine_oil_pressure_kpa', stats.oilPressure ?? stats.engineOilPressure ?? null, null, null);
    push('engine_oil_temp_c', stats.oilTemp ?? stats.engineOilTemp ?? null, null, null);
    push('engine_torque_pct', stats.engineTorque ?? stats.torquePercent ?? null, null, null);
    push('throttle_position_pct', stats.throttlePosition ?? null, null, null);
    push('intake_manifold_pressure_kpa', stats.intakeManifoldPressure ?? stats.boostPressure ?? null, null, null);
    push('intake_manifold_temp_c', stats.intakeManifoldTemp ?? null, null, null);
    push('turbo_boost_pressure_kpa', stats.turboBoostPressure ?? null, null, null);
    push('exhaust_gas_temp_c', stats.exhaustGasTemp ?? stats.egt ?? null, null, null);
    push('coolant_level_pct', stats.coolantLevel ?? null, null, null);
    push('ambient_air_temp_c', stats.ambientTemp ?? stats.ambientAirTemp ?? null, null, null);
    push('engine_seconds', stats.engineHours ? stats.engineHours * 3600 : (stats.engineSeconds ?? null), null, null);
    push('idle_seconds', stats.idleHours ? stats.idleHours * 3600 : (stats.idleSeconds ?? null), null, null);

    // Fuel
    push('fuel_pct', stats.fuelLevel ?? stats.fuelPercent ?? null, null, null);
    push('fuel_rate_lph', stats.fuelRate ?? null, null, null);
    push('fuel_used_liters', stats.totalFuelUsed ?? stats.fuelUsed ?? null, null, null);
    push('fuel_economy_kpl', stats.fuelEconomy ?? null, null, null);

    // Aftertreatment
    push('def_level_pct', stats.defLevel ?? stats.dieselExhaustFluidLevel ?? null, null, null);
    push('dpf_soot_load_pct', stats.dpfSootLoad ?? null, null, null);
    push('dpf_regen_status', null, stats.dpfRegenStatus ?? null, null);
    push('dpf_outlet_temp_c', stats.dpfOutletTemp ?? null, null, null);

    // Transmission
    push('transmission_gear', stats.currentGear ?? stats.transmissionGear ?? null, null, null);
    push('transmission_oil_temp_c', stats.transmissionOilTemp ?? null, null, null);

    // Brakes
    push('brake_air_pressure_primary_kpa', stats.brakePrimaryPressure ?? null, null, null);
    push('brake_air_pressure_secondary_kpa', stats.brakeSecondaryPressure ?? null, null, null);
    push('parking_brake_engaged', null, null, stats.parkingBrake ?? null);

    // Electrical
    push('battery_voltage', stats.batteryVoltage ?? stats.voltage ?? null, null, null);
    push('alternator_voltage', stats.alternatorVoltage ?? null, null, null);

    // Location
    push('speed_mph', stats.speed ?? stats.vehicleSpeed ?? null, null, null);
    push('heading_deg', stats.heading ?? stats.bearing ?? null, null, null);
    push('latitude', stats.latitude ?? stats.lat ?? null, null, null);
    push('longitude', stats.longitude ?? stats.lng ?? stats.lon ?? null, null, null);
    push('odometer_meters', stats.odometerMiles ? stats.odometerMiles * 1609.34 : (stats.odometerMeters ?? null), null, null);

    // Misc
    push('cruise_control_active', null, null, stats.cruiseControlActive ?? null);
    push('gateway_connected', null, null, stats.gatewayConnected ?? stats.deviceOnline ?? null);
  }

  // ── Tell-tales ─────────────────────────────────────────────
  const ind = data.indicators || data.warningIndicators || {};
  if (Object.keys(ind).length > 0) {
    const ts = result.timestamp;
    const pushTT = (name, val) => {
      if (val == null) return;
      result.signals.push({
        provider: 'omnitracs',
        provider_vehicle_id: result.vehicleId,
        signal_name: name,
        numeric_value: null,
        text_value: typeof val === 'string' ? val : (val ? 'on' : 'off'),
        bool_value: null,
        unit: null,
        observed_at: ts,
      });
    };
    pushTT('tell_tale_mil', ind.mil ?? ind.checkEngine ?? null);
    pushTT('tell_tale_stop_lamp', ind.stopLamp ?? ind.stop ?? null);
    pushTT('tell_tale_warning_lamp', ind.warningLamp ?? ind.warning ?? null);
    pushTT('tell_tale_protect_lamp', ind.protectLamp ?? null);
    pushTT('tell_tale_dpf_lamp', ind.dpfLamp ?? null);
  }

  // ── Operational events ─────────────────────────────────────
  const eventType = payload.eventType || payload.event_type || '';
  if (eventType.includes('trip_start') || eventType === 'ignition_on') {
    result.operationalEvents.push({ event_type: 'trip_started', event_payload: data, observed_at: result.timestamp });
  }
  if (eventType.includes('trip_end') || eventType === 'ignition_off') {
    result.operationalEvents.push({ event_type: 'trip_ended', event_payload: data, observed_at: result.timestamp });
  }
  if (eventType.includes('disconnect') || eventType.includes('offline')) {
    result.operationalEvents.push({ event_type: 'gateway_disconnected', event_payload: data, observed_at: result.timestamp });
  }

  // ── DVIR defects ───────────────────────────────────────────
  const defects = data.defects || data.dvirDefects || data.inspectionDefects || [];
  for (const d of (Array.isArray(defects) ? defects : [defects])) {
    if (!d) continue;
    result.defects.push({
      defect_type: d.defectType || d.category || 'unknown',
      severity: d.severity || 'unknown',
      status: d.resolved ? 'resolved' : 'open',
      notes: d.notes || d.comment || null,
      reported_at: d.reportedAt || result.timestamp,
      resolved_at: d.resolvedAt || null,
    });
  }

  return result;
}

// ─── REST API Calls ─────────────────────────────────────────────────

/** Fetch all vehicles. */
export async function fetchVehicles({ accessToken, baseUrl, tokenData }) {
  const auth = tokenData || { access_token: accessToken, base_url: baseUrl };
  const resp = await omnitracsFetch('/vehicles', auth);
  const vehicles = resp.vehicles || resp.data || resp.items || [];
  return vehicles.map(v => ({
    id: v.id || v.vehicleId || v.unitId,
    name: v.name || v.label || v.unitName || `Vehicle ${v.id}`,
    vin: v.vin || v.vehicleIdentificationNumber || null,
    make: v.make || null,
    model: v.model || null,
    year: v.year || null,
    serial: v.serialNumber || v.unitSerial || null,
  }));
}

/** Fetch current fault codes / diagnostics. */
export async function fetchCurrentFaults({ accessToken, providerVehicleId, baseUrl, tokenData }) {
  const auth = tokenData || { access_token: accessToken, base_url: baseUrl };
  const resp = await omnitracsFetch(
    `/vehicles/${providerVehicleId}/diagnostics`,
    auth
  );
  return resp.diagnostics || resp.faults || resp.data || [];
}

/** Fetch current engine data / signals. */
export async function fetchCurrentSignals({ accessToken, providerVehicleId, baseUrl, tokenData }) {
  const auth = tokenData || { access_token: accessToken, base_url: baseUrl };
  const resp = await omnitracsFetch(
    `/vehicles/${providerVehicleId}/engine-data`,
    auth
  );
  return resp.data || resp.engineData || resp;
}

/** Fetch current location. */
export async function fetchCurrentLocation({ accessToken, providerVehicleId, baseUrl, tokenData }) {
  const auth = tokenData || { access_token: accessToken, base_url: baseUrl };
  const resp = await omnitracsFetch(
    `/vehicles/${providerVehicleId}/location`,
    auth
  );
  const loc = resp.location || resp.data || resp;
  if (!loc) return null;
  return {
    latitude: loc.latitude ?? loc.lat,
    longitude: loc.longitude ?? loc.lng ?? loc.lon,
    speed: loc.speed ?? loc.vehicleSpeed,
    heading: loc.heading ?? loc.bearing,
    time: loc.timestamp || loc.eventTime,
  };
}

/** Fetch inspection defects (DVIR). */
export async function fetchInspectionDefects({ accessToken, providerVehicleId, baseUrl, tokenData }) {
  const auth = tokenData || { access_token: accessToken, base_url: baseUrl };
  try {
    const resp = await omnitracsFetch(
      `/vehicles/${providerVehicleId}/inspections?limit=25`,
      auth
    );
    return (resp.inspections || resp.data || []).flatMap(dvir =>
      (dvir.defects || []).map(d => ({
        defect_type: d.defectType || d.category || 'unknown',
        severity: d.severity || 'unknown',
        status: d.resolved ? 'resolved' : 'open',
        notes: d.notes || d.comment || null,
        reported_at: d.reportedAt || dvir.inspectionDate,
        resolved_at: d.resolvedAt || null,
      }))
    );
  } catch {
    return [];
  }
}

/**
 * Full "sync now" for Omnitracs.
 * Fetches all available data and returns normalized events.
 */
export async function syncNow({ accessToken, providerVehicleId, vehicleId, baseUrl, tokenData }) {
  const resolvedVehicleId = providerVehicleId || vehicleId;
  const auth = tokenData || { access_token: accessToken, base_url: baseUrl };

  if (!resolvedVehicleId) {
    return { faults: [], signals: [], operationalEvents: [], defects: [], vehicleId: null, timestamp: new Date().toISOString() };
  }

  const [faults, engineData, location, defects] = await Promise.all([
    fetchCurrentFaults({ tokenData: auth, providerVehicleId: resolvedVehicleId }).catch(() => []),
    fetchCurrentSignals({ tokenData: auth, providerVehicleId: resolvedVehicleId }).catch(() => []),
    fetchCurrentLocation({ tokenData: auth, providerVehicleId: resolvedVehicleId }).catch(() => null),
    fetchInspectionDefects({ tokenData: auth, providerVehicleId: resolvedVehicleId }).catch(() => []),
  ]);

  const syntheticPayload = {
    data: {
      vehicleId: resolvedVehicleId,
      timestamp: new Date().toISOString(),
      diagnostics: faults,
      engineData,
      defects,
    },
  };

  if (location) {
    syntheticPayload.data.vehicleStats = {
      latitude: location.latitude,
      longitude: location.longitude,
      speed: location.speed,
      heading: location.heading,
    };
  }

  const normalized = normalizeWebhook(syntheticPayload);
  normalized.defects = defects;
  return normalized;
}

/**
 * Omnitracs does not support programmatic webhook registration.
 * Webhooks must be configured through the Omnitracs partner portal.
 */
export async function registerWebhooks() {
  throw new Error(
    'Omnitracs webhook registration requires partner portal access. ' +
    'Configure webhooks at https://developer.omnitracs.com and point to /api/webhooks/omnitracs'
  );
}
