/**
 * Provider Capability Matrix
 *
 * Documents which telematics providers support which data categories.
 * Values: true | false | 'partial'
 *
 * 'partial' means the provider exposes some data in this category but
 * not the full breadth (e.g., limited tell-tale enum coverage).
 */

export const PROVIDER_CAPABILITIES = {
  samsara: {
    oauth: true,
    webhooks: true,
    registerWebhooks: true,
    faultCodes: true,
    tellTales: true,
    signals: true,
    location: true,
    engineHours: true,
    fuel: true,
    def: true,
    gatewayEvents: true,
    inspectionDefects: true,
    tirePressure: true,
    oilLife: false,
  },
  motive: {
    oauth: true,
    webhooks: true,
    registerWebhooks: false, // Motive webhook registration may require dashboard config
    faultCodes: true,
    tellTales: 'partial',    // Limited tell-tale enum coverage
    signals: true,
    location: true,
    engineHours: true,
    fuel: true,
    fuelRate: 'partial',     // Available via performance_events / IFTA
    def: 'partial',          // DEF level available on some vehicles/gateways
    aftertreatment: 'partial', // DPF/SCR data available on supported gateways
    transmission: 'partial',  // Gear and temps on J1939-equipped vehicles
    brakes: 'partial',       // Air pressure available on vehicles with J1939 brake bus
    gatewayEvents: true,
    inspectionDefects: 'partial', // DVIR available but field coverage varies
    tirePressure: 'partial', // Available with TPMS-equipped trailers/vehicles
    oilLife: false,
    engineSummary: true,     // Via /performance_events
    ifta: true,              // Via /ifta/trips
  },
  geotab: {
    oauth: false,             // Uses session-based credential auth
    authType: 'credentials',  // username + password + database
    webhooks: false,          // No push webhooks — uses GetFeed polling
    registerWebhooks: false,
    polling: true,            // GetFeed incremental polling (cron every 15 min)
    faultCodes: true,
    tellTales: true,          // Derived from FaultData lamp states
    signals: true,            // Via StatusData + diagnostic mapping
    location: true,           // Via LogRecord
    engineHours: true,
    fuel: true,
    fuelRate: true,
    def: true,
    aftertreatment: true,     // DPF soot/ash, SCR temps, DEF consumption
    transmission: true,       // Gear, oil temp, oil pressure, output shaft speed
    brakes: true,             // Primary/secondary air pressure, parking brake
    gatewayEvents: false,
    inspectionDefects: true,  // Via DVIRLog
    tirePressure: false,      // Not natively available; requires Add-In
    oilLife: false,
    engineSummary: false,
  },
  verizonconnect: {
    oauth: false,             // Uses client_credentials grant (API key + secret)
    authType: 'credentials',
    apiAccess: 'partner',     // Developer portal is partner-gated
    webhooks: 'partial',      // Webhook support depends on partnership tier
    registerWebhooks: false,
    faultCodes: true,
    tellTales: 'partial',
    signals: true,
    location: true,
    engineHours: true,
    fuel: true,
    fuelRate: 'partial',
    def: 'partial',
    aftertreatment: 'partial',
    transmission: 'partial',
    brakes: 'partial',
    gatewayEvents: false,
    inspectionDefects: 'partial',
    tirePressure: false,
    oilLife: false,
  },
  omnitracs: {
    oauth: false,             // Uses client_credentials grant (API key + secret)
    authType: 'credentials',
    apiAccess: 'partner',     // Developer portal unavailable (404)
    webhooks: 'partial',      // Webhook support depends on partnership tier
    registerWebhooks: false,
    faultCodes: true,
    tellTales: 'partial',
    signals: true,
    location: true,
    engineHours: true,
    fuel: true,
    fuelRate: 'partial',
    def: 'partial',
    aftertreatment: 'partial',
    transmission: 'partial',
    brakes: 'partial',
    gatewayEvents: false,
    inspectionDefects: 'partial',
    tirePressure: false,
    oilLife: false,
  },
};

/**
 * Canonical signal names with metadata.
 * Used by normalizers to map provider-specific field names.
 *
 * Categories:
 *   engine        – Core engine parameters (RPM, load, temps, pressures)
 *   fuel          – Fuel system (level, rate, economy, consumption)
 *   aftertreatment – DPF / SCR / DEF / exhaust
 *   transmission  – Gear, temps, pressures
 *   brake         – Air pressure, pad wear, ABS, parking brake
 *   tire          – TPMS pressure & temp per axle position
 *   electrical    – Battery, alternator
 *   location      – GPS, speed, heading
 *   telltale      – Dashboard warning lamps
 *   misc          – Cruise control, HVAC, gateway, odometer, hours
 */
export const CANONICAL_SIGNALS = {
  // ── Engine ───────────────────────────────────────────────
  engine_rpm:                { unit: 'rpm',  type: 'numeric', category: 'engine' },
  engine_load_pct:           { unit: '%',    type: 'numeric', category: 'engine' },
  engine_coolant_temp_c:     { unit: '°C',   type: 'numeric', category: 'engine' },
  engine_oil_pressure_kpa:   { unit: 'kPa',  type: 'numeric', category: 'engine' },
  engine_oil_temp_c:         { unit: '°C',   type: 'numeric', category: 'engine' },
  engine_torque_pct:         { unit: '%',    type: 'numeric', category: 'engine' },
  throttle_position_pct:     { unit: '%',    type: 'numeric', category: 'engine' },
  intake_manifold_pressure_kpa: { unit: 'kPa', type: 'numeric', category: 'engine' },
  intake_manifold_temp_c:    { unit: '°C',   type: 'numeric', category: 'engine' },
  turbo_boost_pressure_kpa:  { unit: 'kPa',  type: 'numeric', category: 'engine' },
  exhaust_gas_temp_c:        { unit: '°C',   type: 'numeric', category: 'engine' },
  coolant_level_pct:         { unit: '%',    type: 'numeric', category: 'engine' },
  coolant_pressure_kpa:      { unit: 'kPa',  type: 'numeric', category: 'engine' },
  engine_seconds:            { unit: 's',    type: 'numeric', category: 'engine' },
  idle_seconds:              { unit: 's',    type: 'numeric', category: 'engine' },
  engine_state:              { unit: null,   type: 'text',    category: 'engine' },
  ambient_air_temp_c:        { unit: '°C',   type: 'numeric', category: 'engine' },

  // ── Fuel ─────────────────────────────────────────────────
  fuel_pct:                  { unit: '%',    type: 'numeric', category: 'fuel' },
  fuel_rate_lph:             { unit: 'L/h',  type: 'numeric', category: 'fuel' },
  fuel_used_liters:          { unit: 'L',    type: 'numeric', category: 'fuel' },
  fuel_economy_kpl:          { unit: 'km/L', type: 'numeric', category: 'fuel' },
  idle_fuel_used_liters:     { unit: 'L',    type: 'numeric', category: 'fuel' },

  // ── Aftertreatment (DPF / SCR / DEF) ────────────────────
  def_level_pct:             { unit: '%',    type: 'numeric', category: 'aftertreatment' },
  def_consumption_rate_lph:  { unit: 'L/h',  type: 'numeric', category: 'aftertreatment' },
  def_tank_temp_c:           { unit: '°C',   type: 'numeric', category: 'aftertreatment' },
  dpf_soot_load_pct:         { unit: '%',    type: 'numeric', category: 'aftertreatment' },
  dpf_ash_load_pct:          { unit: '%',    type: 'numeric', category: 'aftertreatment' },
  dpf_regen_status:          { unit: null,   type: 'text',    category: 'aftertreatment' },
  dpf_outlet_temp_c:         { unit: '°C',   type: 'numeric', category: 'aftertreatment' },
  dpf_differential_pressure_kpa: { unit: 'kPa', type: 'numeric', category: 'aftertreatment' },
  scr_inlet_temp_c:          { unit: '°C',   type: 'numeric', category: 'aftertreatment' },
  scr_outlet_temp_c:         { unit: '°C',   type: 'numeric', category: 'aftertreatment' },
  scr_efficiency_pct:        { unit: '%',    type: 'numeric', category: 'aftertreatment' },
  egr_valve_position_pct:    { unit: '%',    type: 'numeric', category: 'aftertreatment' },

  // ── Transmission ─────────────────────────────────────────
  transmission_gear:         { unit: null,   type: 'numeric', category: 'transmission' },
  transmission_oil_temp_c:   { unit: '°C',   type: 'numeric', category: 'transmission' },
  transmission_oil_pressure_kpa: { unit: 'kPa', type: 'numeric', category: 'transmission' },
  output_shaft_speed_rpm:    { unit: 'rpm',  type: 'numeric', category: 'transmission' },

  // ── Brakes ───────────────────────────────────────────────
  brake_air_pressure_primary_kpa:   { unit: 'kPa', type: 'numeric', category: 'brake' },
  brake_air_pressure_secondary_kpa: { unit: 'kPa', type: 'numeric', category: 'brake' },
  parking_brake_engaged:     { unit: null,   type: 'bool',    category: 'brake' },
  brake_pad_wear_pct:        { unit: '%',    type: 'numeric', category: 'brake' },
  abs_active:                { unit: null,   type: 'bool',    category: 'brake' },
  traction_control_active:   { unit: null,   type: 'bool',    category: 'brake' },

  // ── Tires (TPMS) ────────────────────────────────────────
  tire_pressure_lf_kpa:      { unit: 'kPa',  type: 'numeric', category: 'tire' },
  tire_pressure_rf_kpa:      { unit: 'kPa',  type: 'numeric', category: 'tire' },
  tire_pressure_lro_kpa:     { unit: 'kPa',  type: 'numeric', category: 'tire' },
  tire_pressure_rro_kpa:     { unit: 'kPa',  type: 'numeric', category: 'tire' },
  tire_pressure_lri_kpa:     { unit: 'kPa',  type: 'numeric', category: 'tire' },
  tire_pressure_rri_kpa:     { unit: 'kPa',  type: 'numeric', category: 'tire' },
  tire_temp_lf_c:            { unit: '°C',   type: 'numeric', category: 'tire' },
  tire_temp_rf_c:            { unit: '°C',   type: 'numeric', category: 'tire' },
  tire_temp_lro_c:           { unit: '°C',   type: 'numeric', category: 'tire' },
  tire_temp_rro_c:           { unit: '°C',   type: 'numeric', category: 'tire' },

  // ── Electrical ───────────────────────────────────────────
  battery_voltage:           { unit: 'V',    type: 'numeric', category: 'electrical' },
  alternator_voltage:        { unit: 'V',    type: 'numeric', category: 'electrical' },

  // ── Location ─────────────────────────────────────────────
  latitude:                  { unit: 'deg',  type: 'numeric', category: 'location' },
  longitude:                 { unit: 'deg',  type: 'numeric', category: 'location' },
  speed_mph:                 { unit: 'mph',  type: 'numeric', category: 'location' },
  heading_deg:               { unit: 'deg',  type: 'numeric', category: 'location' },
  odometer_meters:           { unit: 'm',    type: 'numeric', category: 'location' },

  // ── Tell-tales ───────────────────────────────────────────
  tell_tale_mil:             { unit: null,   type: 'text', category: 'telltale' },
  tell_tale_stop_lamp:       { unit: null,   type: 'text', category: 'telltale' },
  tell_tale_warning_lamp:    { unit: null,   type: 'text', category: 'telltale' },
  tell_tale_protect_lamp:    { unit: null,   type: 'text', category: 'telltale' },
  tell_tale_dpf_lamp:        { unit: null,   type: 'text', category: 'telltale' },
  tell_tale_wait_to_start:   { unit: null,   type: 'text', category: 'telltale' },

  // ── Misc ─────────────────────────────────────────────────
  cruise_control_active:     { unit: null,   type: 'bool',    category: 'misc' },
  cruise_control_set_speed_mph: { unit: 'mph', type: 'numeric', category: 'misc' },
  gateway_connected:         { unit: null,   type: 'bool',    category: 'misc' },
};

/**
 * Check if a provider supports a capability.
 * Returns true, false, or 'partial'.
 */
export function providerSupports(provider, capability) {
  return PROVIDER_CAPABILITIES[provider]?.[capability] ?? false;
}
