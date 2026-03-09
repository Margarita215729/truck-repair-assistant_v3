/**
 * Data normalization layer for the Intake & Triage report.
 *
 * These functions compute vin_status and dtc_status deterministically
 * from UI state so the AI never has to infer them.
 */

/**
 * Compute vin_status from truck + context state.
 * @returns {"provided" | "invalid" | "unavailable" | "unknown"}
 */
export function computeVinStatus(truck, roadsideContext) {
  const vin = roadsideContext?.vin || truck?.vin || truck?.details?.vin;
  if (!vin || !vin.trim()) return 'unavailable';
  if (vin.trim().length === 17) return 'provided';
  // Non-empty but wrong length → invalid format
  return 'invalid';
}

/**
 * Compute dtc_status from codes + context state.
 * @returns {"active_present" | "history_only" | "none_reported" | "unavailable" | "unknown"}
 */
export function computeDtcStatus(activeCodes = [], historyCodes = [], noCodesAvailable = false) {
  if (activeCodes.length > 0) return 'active_present';
  if (noCodesAvailable) return 'none_reported';
  if (historyCodes.length > 0) return 'history_only';
  return 'unknown';
}

/**
 * Backward-compatible mappers:
 * Map new enum values to old ones that the LLM schema may still expect.
 */
export function dtcStatusToLegacy(status) {
  if (status === 'active_present') return 'active_reported';
  return status;
}

export function vinStatusToLegacy(status) {
  if (status === 'invalid') return 'unavailable';
  return status;
}

/**
 * Build the full normalized evidence payload that is sent to the AI.
 */
export function buildNormalizedPayload({ truck, roadsideContext, messages, errorCodes, symptoms }) {
  const ctx = roadsideContext || {};

  // Active + history codes from both sources (deduplicated)
  const activeCodes = [...new Set([...(ctx.faultCodes || []), ...(errorCodes || [])])];
  const historyCodes = [...new Set(ctx.historyFaultCodes || [])];

  const vinValue = ctx.vin || truck?.vin || truck?.details?.vin || null;

  return {
    vehicle_info: {
      year_reported: truck?.year || null,
      make: truck?.make || null,
      model: truck?.model || null,
      engine: truck?.details?.engine_type || null,
      transmission: truck?.details?.transmission_model || null,
      mileage_reported: truck?.details?.mileage ? `${truck.details.mileage.toLocaleString()} miles` : null,
      vin: vinValue,
      vin_status: computeVinStatus(truck, ctx),
      _dataSource: 'user_reported',
    },

    fault_codes: {
      dtc_status: computeDtcStatus(activeCodes, historyCodes, ctx.noCodesAvailable),
      active_codes: activeCodes.map(code => ({
        raw_code: code,
        module: null,
        system: null,
        status: 'active',
        notes: null,
      })),
      history_codes: historyCodes.map(code => ({
        raw_code: code,
        module: null,
        system: null,
        status: 'history',
        notes: null,
      })),
      notes: ctx.noCodesAvailable ? 'Driver reports no active fault codes available at time of intake.' : null,
      _dataSource: 'user_reported',
    },

    evidence: {
      driver_reported_symptoms: symptoms || [],
      when_it_happens: ctx.whenItHappens || null,
      recent_events: ctx.recentEvents || [],
      dashboard_messages: ctx.dashboardMessage ? [ctx.dashboardMessage] : [],
      checks_already_done: ctx.checksAlreadyDone
        ? ctx.checksAlreadyDone.split('\n').map(s => s.trim()).filter(Boolean)
        : [],
      attachments: {
        photos: false,
        audio: messages?.some(m => m.audio_url) || false,
      },
      _dataSource: 'user_reported',
    },

    mode: ctx.mode || 'roadside',
  };
}
