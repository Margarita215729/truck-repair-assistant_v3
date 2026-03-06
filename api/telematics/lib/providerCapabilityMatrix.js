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
    def: 'partial',          // DEF level available on some vehicles/gateways
    gatewayEvents: true,
    inspectionDefects: 'partial', // DVIR available but field coverage varies
    tirePressure: false,
    oilLife: false,
  },
};

/**
 * Canonical signal names with metadata.
 * Used by normalizers to map provider-specific field names.
 */
export const CANONICAL_SIGNALS = {
  battery_voltage:        { unit: 'V',    type: 'numeric' },
  engine_coolant_temp_c:  { unit: '°C',   type: 'numeric' },
  engine_oil_pressure_kpa:{ unit: 'kPa',  type: 'numeric' },
  engine_load_pct:        { unit: '%',    type: 'numeric' },
  engine_rpm:             { unit: 'rpm',  type: 'numeric' },
  fuel_pct:               { unit: '%',    type: 'numeric' },
  def_level_pct:          { unit: '%',    type: 'numeric' },
  ambient_air_temp_c:     { unit: '°C',   type: 'numeric' },
  intake_manifold_temp_c: { unit: '°C',   type: 'numeric' },
  odometer_meters:        { unit: 'm',    type: 'numeric' },
  engine_seconds:         { unit: 's',    type: 'numeric' },
  speed_mph:              { unit: 'mph',  type: 'numeric' },
  heading_deg:            { unit: 'deg',  type: 'numeric' },
  tell_tale_stop_lamp:    { unit: null,   type: 'text' },
  tell_tale_warning_lamp: { unit: null,   type: 'text' },
  tell_tale_protect_lamp: { unit: null,   type: 'text' },
  tell_tale_mil:          { unit: null,   type: 'text' },
  engine_state:           { unit: null,   type: 'text' },
  gateway_connected:      { unit: null,   type: 'bool' },
  latitude:               { unit: 'deg',  type: 'numeric' },
  longitude:              { unit: 'deg',  type: 'numeric' },
};

/**
 * Check if a provider supports a capability.
 * Returns true, false, or 'partial'.
 */
export function providerSupports(provider, capability) {
  return PROVIDER_CAPABILITIES[provider]?.[capability] ?? false;
}
