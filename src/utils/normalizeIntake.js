/**
 * Data normalization layer for the Intake & Triage report.
 *
 * These functions compute vin_status and dtc_status deterministically
 * from UI state so the AI never has to infer them.
 */

/**
 * Compute vin_status from truck + context state.
 * @returns {"provided" | "unavailable" | "unknown"}
 */
export function computeVinStatus(truck, roadsideContext) {
  const vin = roadsideContext?.vin || truck?.vin || truck?.details?.vin;
  if (vin && vin.trim().length >= 11) return 'provided';
  return 'unavailable';
}

/**
 * Compute dtc_status from codes + context state.
 * @returns {"active_reported" | "history_only" | "none_reported" | "unknown"}
 */
export function computeDtcStatus(activeCodes = [], historyCodes = [], noCodesAvailable = false) {
  if (activeCodes.length > 0) return 'active_reported';
  if (noCodesAvailable) return 'none_reported';
  if (historyCodes.length > 0) return 'history_only';
  return 'unknown';
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
    },

    mode: ctx.mode || 'roadside',
  };
}
