/**
 * Fault Event Normalizer
 *
 * Takes a raw provider fault object (from adapter.normalizeWebhook)
 * and produces a row-ready object for `fault_events_normalized`.
 */

const OBDII_RE = /^[PUBCN]\d{4}/i;

/**
 * Classify the code type based on available fields.
 */
function classifyCodeType({ spn, fmi, dtc, oem_code }) {
  if (spn != null && fmi != null) return 'J1939';
  if (dtc && OBDII_RE.test(dtc)) return 'OBDII';
  if (oem_code) return 'OEM';
  if (dtc) return 'OEM'; // Non-standard code string
  return 'UNKNOWN';
}

/**
 * Derive severity from lamp status and provider-supplied indicators.
 */
function deriveSeverity(fault) {
  const lamps = fault.lamp_status || {};
  if (lamps.stop === true || lamps.stop === 'on' || lamps.protect === true || lamps.protect === 'on') {
    return 'critical';
  }
  if (lamps.warning === true || lamps.warning === 'on' || lamps.mil === true || lamps.mil === 'on') {
    return 'warning';
  }
  // If the provider already supplies severity, map it
  const ps = (fault.provider_severity || '').toLowerCase();
  if (ps === 'critical' || ps === 'severe' || ps === 'high') return 'critical';
  if (ps === 'low' || ps === 'info' || ps === 'informational') return 'info';
  return 'warning'; // default
}

/**
 * Normalize a single fault event from any provider adapter.
 *
 * @param {Object} fault - Raw fault from adapter normalizeWebhook output
 * @returns {Object} Row-ready for fault_events_normalized
 */
export function normalizeFaultEvent(fault) {
  const codeType = classifyCodeType(fault);
  const severity = deriveSeverity(fault);

  return {
    provider: fault.provider,
    provider_vehicle_id: fault.provider_vehicle_id || null,
    code_type: codeType,
    spn: fault.spn ?? null,
    fmi: fault.fmi ?? null,
    dtc: fault.dtc || null,
    oem_code: fault.oem_code || null,
    severity,
    status: fault.status === 'cleared' ? 'cleared' : 'active',
    first_seen_at: fault.first_seen_at || fault.observed_at || new Date().toISOString(),
    last_seen_at: fault.last_seen_at || fault.observed_at || new Date().toISOString(),
    observed_at: fault.observed_at || new Date().toISOString(),
    // provider_event_id for correlation (stored in raw)
    _provider_event_id: fault.provider_event_id || null,
  };
}

/**
 * Normalize a batch of faults.
 */
export function normalizeFaultEvents(faults) {
  return (faults || []).map(normalizeFaultEvent);
}
