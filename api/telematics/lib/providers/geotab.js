/**
 * Geotab Provider Adapter
 *
 * Implements the telematics provider interface for Geotab's MyGeotab API.
 * Docs: https://developers.geotab.com/myGeotab/apiReference
 *
 * Geotab uses JSON-RPC over HTTPS with session-based authentication
 * (username + password + database). No OAuth flow — credentials are
 * stored encrypted in TokenVault.
 *
 * Data ingestion: Cron-based GetFeed polling + on-demand syncNow.
 */
import { CANONICAL_SIGNALS } from '../providerCapabilityMatrix.js';

const DEFAULT_SERVER = 'my.geotab.com';

// ─── JSON-RPC Helper ─────────────────────────────────────────────────

/**
 * Make a Geotab JSON-RPC API call.
 * @param {string} server - e.g. 'myXYZ.geotab.com' (from Authenticate response path)
 * @param {string} method - e.g. 'Get', 'GetFeed', 'Authenticate'
 * @param {object} params - method-specific parameters
 * @param {object|null} credentials - { database, sessionId, userName } (null for Authenticate)
 * @returns {object} result from the JSON-RPC response
 */
async function geotabCall(server, method, params = {}, credentials = null) {
  const url = `https://${server}/apiv1`;
  const body = {
    method,
    params: credentials ? { ...params, credentials } : params,
  };

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Geotab API HTTP ${resp.status}: ${text}`);
  }

  const json = await resp.json();

  if (json.error) {
    const errName = json.error.name || json.error.type || '';
    const errMsg = json.error.message || JSON.stringify(json.error);
    const err = new Error(`Geotab ${method} error: ${errMsg}`);
    err.geotabErrorName = errName;
    throw err;
  }

  return json.result;
}

/**
 * Make a Geotab MultiCall (batch multiple calls in one request).
 */
async function geotabMultiCall(server, calls, credentials) {
  const url = `https://${server}/apiv1`;
  const body = {
    method: 'ExecuteMultiCall',
    params: {
      calls: calls.map(c => ({ method: c.method, params: c.params || {} })),
      credentials,
    },
  };

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Geotab MultiCall HTTP ${resp.status}: ${text}`);
  }

  const json = await resp.json();
  if (json.error) {
    const errMsg = json.error.message || JSON.stringify(json.error);
    throw new Error(`Geotab MultiCall error: ${errMsg}`);
  }

  return json.result; // array of results, one per call
}

// ─── Authentication ──────────────────────────────────────────────────

/**
 * Authenticate with Geotab. Returns session credentials + resolved server path.
 *
 * @param {string} database - Geotab database name
 * @param {string} userName - Geotab username
 * @param {string} password - Geotab password
 * @param {string} [server] - Initial server (default 'my.geotab.com')
 * @returns {{ server: string, credentials: { database, sessionId, userName } }}
 */
export async function authenticate(database, userName, password, server) {
  const srv = server || process.env.GEOTAB_DEFAULT_SERVER || DEFAULT_SERVER;
  const result = await geotabCall(srv, 'Authenticate', {
    database,
    userName,
    password,
  });

  // result: { path: 'serverXYZ.geotab.com', credentials: { database, sessionId, userName } }
  const resolvedServer = result.path || srv;
  return {
    server: resolvedServer,
    credentials: result.credentials,
  };
}

// ─── Geotab Diagnostic → Canonical Signal Mapping ────────────────────

/**
 * Known Geotab diagnostic names/IDs mapped to our canonical signal names.
 * Geotab diagnostics are identified by their `id` or `name` property.
 * This map covers the most common engine / vehicle diagnostics.
 */
const DIAGNOSTIC_TO_CANONICAL = {
  // Engine
  'DiagnosticEngineSpeedId':                 'engine_rpm',
  'DiagnosticEngineLoadId':                  'engine_load_pct',
  'DiagnosticEngineCoolantTemperatureId':     'engine_coolant_temp_c',
  'DiagnosticEngineOilPressureId':            'engine_oil_pressure_kpa',
  'DiagnosticEngineOilTemperatureId':         'engine_oil_temp_c',
  'DiagnosticActualEngineTorquePercentId':    'engine_torque_pct',
  'DiagnosticThrottlePositionId':             'throttle_position_pct',
  'DiagnosticIntakeManifoldPressureId':       'intake_manifold_pressure_kpa',
  'DiagnosticIntakeManifoldTemperatureId':    'intake_manifold_temp_c',
  'DiagnosticTurboBoostPressureId':           'turbo_boost_pressure_kpa',
  'DiagnosticExhaustGasTemperatureId':        'exhaust_gas_temp_c',
  'DiagnosticCoolantLevelId':                 'coolant_level_pct',
  'DiagnosticAmbientAirTemperatureId':        'ambient_air_temp_c',
  'DiagnosticEngineHoursId':                  'engine_seconds', // hours → seconds conversion needed
  'DiagnosticIdleHoursId':                    'idle_seconds',   // hours → seconds conversion needed

  // Fuel
  'DiagnosticFuelLevelId':                    'fuel_pct',
  'DiagnosticFuelRateId':                     'fuel_rate_lph',
  'DiagnosticTotalFuelUsedId':                'fuel_used_liters',
  'DiagnosticAverageFuelEconomyId':           'fuel_economy_kpl',
  'DiagnosticIdleFuelUsedId':                 'idle_fuel_used_liters',

  // Aftertreatment
  'DiagnosticDieselExhaustFluidLevelId':      'def_level_pct',
  'DiagnosticDieselExhaustFluidConsumptionRateId': 'def_consumption_rate_lph',
  'DiagnosticDieselExhaustFluidTemperatureId': 'def_tank_temp_c',
  'DiagnosticDieselParticulateFilterSootLoadId': 'dpf_soot_load_pct',
  'DiagnosticDieselParticulateFilterAshLoadId':  'dpf_ash_load_pct',
  'DiagnosticDieselParticulateFilterRegenerationStatusId': 'dpf_regen_status',
  'DiagnosticDieselParticulateFilterOutletTemperatureId': 'dpf_outlet_temp_c',
  'DiagnosticDieselParticulateFilterDifferentialPressureId': 'dpf_differential_pressure_kpa',
  'DiagnosticSCRInletTemperatureId':          'scr_inlet_temp_c',
  'DiagnosticSCROutletTemperatureId':         'scr_outlet_temp_c',

  // Transmission
  'DiagnosticTransmissionCurrentGearId':      'transmission_gear',
  'DiagnosticTransmissionOilTemperatureId':   'transmission_oil_temp_c',
  'DiagnosticTransmissionOilPressureId':      'transmission_oil_pressure_kpa',
  'DiagnosticOutputShaftSpeedId':             'output_shaft_speed_rpm',

  // Brakes
  'DiagnosticBrakePrimaryPressureId':         'brake_air_pressure_primary_kpa',
  'DiagnosticBrakeSecondaryPressureId':       'brake_air_pressure_secondary_kpa',
  'DiagnosticParkingBrakeId':                 'parking_brake_engaged',

  // Electrical
  'DiagnosticBatteryVoltageId':               'battery_voltage',
  'DiagnosticAlternatorVoltageId':            'alternator_voltage',

  // Location / motion
  'DiagnosticVehicleSpeedId':                 'speed_mph', // km/h → mph conversion needed
  'DiagnosticOdometerDistanceId':             'odometer_meters', // km → meters conversion needed
};

/**
 * Fallback: match Geotab diagnostic names by keyword patterns.
 */
function matchDiagnosticByName(diagName) {
  if (!diagName) return null;
  const lower = diagName.toLowerCase();

  const patterns = [
    [/engine.*speed|rpm/,                      'engine_rpm'],
    [/engine.*load/,                           'engine_load_pct'],
    [/coolant.*temp/,                          'engine_coolant_temp_c'],
    [/oil.*press/,                             'engine_oil_pressure_kpa'],
    [/oil.*temp/,                              'engine_oil_temp_c'],
    [/throttle.*pos/,                          'throttle_position_pct'],
    [/intake.*manifold.*press|boost.*press/,   'intake_manifold_pressure_kpa'],
    [/intake.*manifold.*temp/,                 'intake_manifold_temp_c'],
    [/turbo.*boost/,                           'turbo_boost_pressure_kpa'],
    [/exhaust.*gas.*temp|egt/,                 'exhaust_gas_temp_c'],
    [/fuel.*level/,                            'fuel_pct'],
    [/fuel.*rate/,                             'fuel_rate_lph'],
    [/total.*fuel.*used/,                      'fuel_used_liters'],
    [/def.*level|diesel.*exhaust.*fluid.*level/, 'def_level_pct'],
    [/dpf.*soot|particulate.*soot/,            'dpf_soot_load_pct'],
    [/dpf.*regen|particulate.*regen/,          'dpf_regen_status'],
    [/battery.*volt/,                          'battery_voltage'],
    [/alternator.*volt/,                       'alternator_voltage'],
    [/vehicle.*speed/,                         'speed_mph'],
    [/odometer/,                               'odometer_meters'],
    [/transmission.*gear|current.*gear/,       'transmission_gear'],
    [/transmission.*oil.*temp/,                'transmission_oil_temp_c'],
    [/brake.*primary.*press/,                  'brake_air_pressure_primary_kpa'],
    [/brake.*secondary.*press/,                'brake_air_pressure_secondary_kpa'],
    [/parking.*brake/,                         'parking_brake_engaged'],
    [/ambient.*air.*temp/,                     'ambient_air_temp_c'],
    [/engine.*hours/,                          'engine_seconds'],
    [/idle.*hours/,                            'idle_seconds'],
  ];

  for (const [regex, signal] of patterns) {
    if (regex.test(lower)) return signal;
  }
  return null;
}

/**
 * Apply unit conversions for Geotab values that differ from our canonical units.
 */
function convertGeotabValue(signalName, rawValue) {
  if (rawValue == null) return rawValue;

  switch (signalName) {
    case 'engine_seconds':
    case 'idle_seconds':
      return rawValue * 3600; // Geotab reports hours, we store seconds
    case 'speed_mph':
      return rawValue * 0.621371; // km/h → mph
    case 'odometer_meters':
      return rawValue * 1000; // Geotab reports km, we store meters
    default:
      return rawValue;
  }
}

// ─── Webhook Signature ───────────────────────────────────────────────

/**
 * Geotab does not use push webhooks by default.
 * This is a stub for API parity with other providers.
 * If Geotab Add-In Data Feed is configured, implement signature check here.
 */
export function verifyWebhookSignature(/* rawBody, headers, secret */) {
  return false;
}

// ─── Webhook Normalization ───────────────────────────────────────────

/**
 * Normalize Geotab data into our internal event format.
 * Accepts either a webhook-like payload (from feed poller) or syncNow synthetic payload.
 * Returns { faults: [], signals: [], operationalEvents: [], defects: [], vehicleId, timestamp }
 */
export function normalizeWebhook(payload) {
  const result = { faults: [], signals: [], operationalEvents: [], defects: [] };
  const data = payload.data || payload;

  result.vehicleId = data.deviceId || data.vehicle?.id || null;
  result.timestamp = data.timestamp || data.dateTime || new Date().toISOString();

  // ── Fault Codes (FaultData) ────────────────────────────────
  const faults = data.faultData || data.faults || data.fault_codes || [];
  for (const f of (Array.isArray(faults) ? faults : [faults])) {
    if (!f) continue;

    const diag = f.diagnostic || {};
    const failureMode = f.failureMode || {};

    // Determine code type from diagnostic source
    const source = (diag.source || '').toLowerCase();
    let codeType = 'unknown';
    if (source.includes('j1939') || source === 'j1939') codeType = 'J1939';
    else if (source.includes('obd') || source === 'obdii') codeType = 'OBDII';
    else if (source.includes('proprietary') || source.includes('oem')) codeType = 'OEM';

    result.faults.push({
      provider: 'geotab',
      provider_vehicle_id: result.vehicleId,
      spn: failureMode.spnId ?? f.sourceAddress ?? null,
      fmi: failureMode.fmiId ?? failureMode.id ?? null,
      dtc: diag.code || null,
      oem_code: codeType === 'OEM' ? (diag.code || null) : null,
      description: f.faultDescription || diag.name || null,
      status: f.faultState === 'Cleared' || f.faultState === 'Inactive' ? 'cleared' : 'active',
      source_address: f.sourceAddress ?? null,
      first_seen_at: f.dateTime || result.timestamp,
      last_seen_at: f.dateTime || result.timestamp,
      observed_at: f.dateTime || result.timestamp,
      occurrence_count: f.count ?? null,
      lamp_status: {
        mil: f.malfunctionLamp ?? null,
        stop: f.redStopLamp ?? null,
        warning: f.amberWarningLamp ?? null,
        protect: f.protectWarningLamp ?? null,
      },
    });
  }

  // ── Signals (StatusData) ───────────────────────────────────
  const statusData = data.statusData || data.signals || [];
  const ts = result.timestamp;

  for (const sd of (Array.isArray(statusData) ? statusData : [statusData])) {
    if (!sd) continue;

    const diag = sd.diagnostic || {};
    const diagId = diag.id || '';
    const diagName = diag.name || '';

    // Map to canonical signal name
    let signalName = DIAGNOSTIC_TO_CANONICAL[diagId]
                  || matchDiagnosticByName(diagName)
                  || null;

    if (!signalName) continue; // Unknown diagnostic — skip

    const meta = CANONICAL_SIGNALS[signalName] || {};
    const rawValue = sd.data != null ? sd.data : null;
    const convertedValue = convertGeotabValue(signalName, rawValue);

    const isText = meta.type === 'text';
    const isBool = meta.type === 'bool';

    result.signals.push({
      provider: 'geotab',
      provider_vehicle_id: result.vehicleId,
      signal_name: signalName,
      numeric_value: (!isText && !isBool) ? convertedValue : null,
      text_value: isText ? String(convertedValue) : null,
      bool_value: isBool ? Boolean(convertedValue) : null,
      unit: meta.unit || null,
      observed_at: sd.dateTime || ts,
    });
  }

  // ── Tell-tales (from FaultData lamp states) ────────────────
  const pushTT = (name, val) => {
    if (val == null) return;
    result.signals.push({
      provider: 'geotab',
      provider_vehicle_id: result.vehicleId,
      signal_name: name,
      numeric_value: null,
      text_value: val === true ? 'on' : val === false ? 'off' : String(val),
      bool_value: null,
      unit: null,
      observed_at: ts,
    });
  };

  // Aggregate lamp states from all faults (any fault with lamp on → lamp is on)
  let milOn = false, stopOn = false, warnOn = false, protectOn = false;
  for (const f of result.faults) {
    if (f.lamp_status?.mil) milOn = true;
    if (f.lamp_status?.stop) stopOn = true;
    if (f.lamp_status?.warning) warnOn = true;
    if (f.lamp_status?.protect) protectOn = true;
  }
  if (result.faults.length > 0) {
    pushTT('tell_tale_mil', milOn ? 'on' : 'off');
    pushTT('tell_tale_stop_lamp', stopOn ? 'on' : 'off');
    pushTT('tell_tale_warning_lamp', warnOn ? 'on' : 'off');
    pushTT('tell_tale_protect_lamp', protectOn ? 'on' : 'off');
  }

  // ── Location (LogRecord) ───────────────────────────────────
  const loc = data.location || data.logRecord || null;
  if (loc) {
    const push = (name, numVal) => {
      if (numVal == null) return;
      const meta2 = CANONICAL_SIGNALS[name] || {};
      result.signals.push({
        provider: 'geotab',
        provider_vehicle_id: result.vehicleId,
        signal_name: name,
        numeric_value: numVal,
        text_value: null,
        bool_value: null,
        unit: meta2.unit || null,
        observed_at: loc.dateTime || ts,
      });
    };
    push('latitude', loc.latitude);
    push('longitude', loc.longitude);
    push('speed_mph', loc.speed != null ? loc.speed * 0.621371 : null); // km/h → mph
    push('heading_deg', loc.bearing ?? loc.heading ?? null);
  }

  // ── DVIR Defects ───────────────────────────────────────────
  const dvirs = data.dvirLogs || data.defects || [];
  for (const dvir of (Array.isArray(dvirs) ? dvirs : [dvirs])) {
    if (!dvir) continue;
    const defectList = dvir.defects || dvir.dvirDefects || [dvir];
    for (const d of (Array.isArray(defectList) ? defectList : [defectList])) {
      result.defects.push({
        defect_type: d.defectType || d.category || d.name || 'unknown',
        severity: d.severity || (d.isSafeToOperate === false ? 'critical' : 'minor'),
        status: d.resolvedDateTime || d.isResolved ? 'resolved' : 'open',
        notes: d.comment || d.notes || d.remark || null,
        reported_at: d.dateTime || dvir.dateTime || result.timestamp,
        resolved_at: d.resolvedDateTime || null,
      });
    }
  }

  return result;
}

// ─── REST API Calls ─────────────────────────────────────────────────

/**
 * Resolve credentials from token vault data.
 * Geotab tokens stored as: { server, database, userName, password, sessionId }
 */
function resolveAuth(tokenData) {
  const server = tokenData.server || tokenData.path || process.env.GEOTAB_DEFAULT_SERVER || DEFAULT_SERVER;
  const credentials = tokenData.sessionId
    ? { database: tokenData.database, sessionId: tokenData.sessionId, userName: tokenData.userName }
    : null;
  return { server, credentials, raw: tokenData };
}

/**
 * Make a Geotab API call with auto-reauth on session expiry.
 */
async function geotabCallWithReauth(tokenData, method, params) {
  const { server, credentials, raw } = resolveAuth(tokenData);

  if (!credentials) {
    // No session — authenticate first
    const auth = await authenticate(raw.database, raw.userName, raw.password, server);
    Object.assign(tokenData, {
      server: auth.server,
      sessionId: auth.credentials.sessionId,
    });
    return geotabCall(auth.server, method, params, auth.credentials);
  }

  try {
    return await geotabCall(server, method, params, credentials);
  } catch (err) {
    // Re-authenticate on InvalidUserException
    if (err.geotabErrorName === 'InvalidUserException' && raw.password) {
      const auth = await authenticate(raw.database, raw.userName, raw.password, server);
      Object.assign(tokenData, {
        server: auth.server,
        sessionId: auth.credentials.sessionId,
      });
      return geotabCall(auth.server, method, params, auth.credentials);
    }
    throw err;
  }
}

/** Fetch all vehicles (Devices). */
export async function fetchVehicles({ tokenData }) {
  const devices = await geotabCallWithReauth(tokenData, 'Get', {
    typeName: 'Device',
    search: { deviceType: 'Go9' }, // Go9+ for VIN support; remove filter to get all
  });

  return (devices || []).map(d => ({
    id: d.id,
    name: d.name || `Device ${d.id}`,
    vin: d.vehicleIdentificationNumber || null,
    make: null,  // Geotab Device does not expose make/model/year directly
    model: null,
    year: null,
    serial: d.serialNumber || null,
  }));
}

/** Fetch current fault codes (FaultData). */
export async function fetchCurrentFaults({ tokenData, providerVehicleId }) {
  const fromDate = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(); // 72h
  const faultData = await geotabCallWithReauth(tokenData, 'Get', {
    typeName: 'FaultData',
    search: {
      deviceSearch: { id: providerVehicleId },
      fromDate,
    },
  });
  return faultData || [];
}

/** Fetch current signals (StatusData). */
export async function fetchCurrentSignals({ tokenData, providerVehicleId }) {
  const fromDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 24h for signals

  const statusData = await geotabCallWithReauth(tokenData, 'Get', {
    typeName: 'StatusData',
    search: {
      deviceSearch: { id: providerVehicleId },
      fromDate,
    },
    resultsLimit: 500,
  });
  return statusData || [];
}

/** Fetch current location (latest LogRecord). */
export async function fetchCurrentLocation({ tokenData, providerVehicleId }) {
  const logRecords = await geotabCallWithReauth(tokenData, 'Get', {
    typeName: 'LogRecord',
    search: {
      deviceSearch: { id: providerVehicleId },
      fromDate: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // last hour
    },
    resultsLimit: 1,
  });

  const loc = logRecords?.[0];
  if (!loc) return null;
  return {
    latitude: loc.latitude,
    longitude: loc.longitude,
    speed: loc.speed,
    heading: null, // LogRecord doesn't include heading
    time: loc.dateTime,
  };
}

/** Fetch DVIR / inspection defects. */
export async function fetchInspectionDefects({ tokenData, providerVehicleId }) {
  try {
    const dvirs = await geotabCallWithReauth(tokenData, 'Get', {
      typeName: 'DVIRLog',
      search: {
        deviceSearch: { id: providerVehicleId },
        fromDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      },
      resultsLimit: 25,
    });

    return (dvirs || []).flatMap(dvir =>
      (dvir.defects || []).map(d => ({
        defect_type: d.defectType || d.name || 'unknown',
        severity: d.severity || (d.isSafeToOperate === false ? 'critical' : 'minor'),
        status: d.resolvedDateTime ? 'resolved' : 'open',
        notes: d.comment || null,
        reported_at: dvir.dateTime || dvir.inspectionDate,
        resolved_at: d.resolvedDateTime || null,
      }))
    );
  } catch {
    return [];
  }
}

/**
 * Full "sync now" for Geotab.
 * Fetches from all available endpoints and merges into a single normalized payload.
 */
export async function syncNow({ tokenData, providerVehicleId }) {
  const [faults, statusData, location, defects] = await Promise.all([
    fetchCurrentFaults({ tokenData, providerVehicleId }).catch(() => []),
    fetchCurrentSignals({ tokenData, providerVehicleId }).catch(() => []),
    fetchCurrentLocation({ tokenData, providerVehicleId }).catch(() => null),
    fetchInspectionDefects({ tokenData, providerVehicleId }).catch(() => []),
  ]);

  const syntheticPayload = {
    data: {
      deviceId: providerVehicleId,
      timestamp: new Date().toISOString(),
      faultData: faults,
      statusData,
      location,
      dvirLogs: defects.length > 0 ? [{ defects }] : [],
    },
  };

  const normalized = normalizeWebhook(syntheticPayload);
  normalized.defects = defects;
  return normalized;
}

/**
 * Geotab GetFeed — incremental data polling with resume tokens.
 * Used by the cron poller (geotab-feed.js).
 *
 * @param {object} tokenData - Decrypted credentials from TokenVault
 * @param {string} typeName - 'FaultData' or 'StatusData'
 * @param {string|null} fromVersion - Resume token from previous call (null for first call)
 * @returns {{ data: Array, toVersion: string }}
 */
export async function getFeed({ tokenData, typeName, fromVersion }) {
  const params = { typeName };
  if (fromVersion) {
    params.fromVersion = fromVersion;
  } else {
    // First call — use a fromDate instead
    params.search = {
      fromDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  const result = await geotabCallWithReauth(tokenData, 'GetFeed', params);
  return {
    data: result?.data || [],
    toVersion: result?.toVersion || null,
  };
}

/**
 * Geotab does not support programmatic webhook registration.
 * Data comes via GetFeed polling.
 */
export async function registerWebhooks() {
  throw new Error(
    'Geotab does not use push webhooks. Data is ingested via GetFeed polling (see /api/telematics/geotab-feed). ' +
    'For real-time notifications, configure a Geotab Add-In Data Feed.'
  );
}
