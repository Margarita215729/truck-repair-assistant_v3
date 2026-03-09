/**
 * Unified Report Adapter Layer
 *
 * Normalizes both legacy (fields on report root) and new-format
 * (fields inside report.report_data with report_type === 'INTAKE_Triage_Roadside')
 * reports into a stable API.  Every function returns a safe default and never throws.
 */

/* ── format detection ───────────────────────────────────────── */

export function isNewFormatReport(report) {
  return report?.report_data?.report_type === 'INTAKE_Triage_Roadside';
}

export function getReportFormat(report) {
  return isNewFormatReport(report) ? 'new' : 'legacy';
}

/* ── payload shortcut ───────────────────────────────────────── */

export function getReportPayload(report) {
  return report?.report_data || {};
}

/* ── vehicle info ───────────────────────────────────────────── */

const EMPTY_VEHICLE = {
  year: null, make: null, model: null, engine: null,
  transmission: null, mileage: null, vin: null, vin_status: 'unknown',
};

export function getVehicleInfo(report) {
  if (!report) return { ...EMPTY_VEHICLE };
  const rd = getReportPayload(report);

  if (isNewFormatReport(report) && rd.vehicle_info) {
    const vi = rd.vehicle_info;
    return {
      year: vi.year_reported ?? vi.year ?? null,
      make: vi.make ?? null,
      model: vi.model ?? null,
      engine: vi.engine ?? null,
      transmission: vi.transmission ?? null,
      mileage: vi.mileage_reported ?? null,
      vin: vi.vin ?? null,
      vin_status: vi.vin_status || 'unknown',
    };
  }

  const ti = report.truck_info || {};
  return {
    year: ti.year ?? null,
    make: ti.make ?? null,
    model: ti.model ?? null,
    engine: ti.engine ?? null,
    transmission: ti.transmission ?? null,
    mileage: ti.mileage ?? null,
    vin: ti.vin ?? null,
    vin_status: ti.vin ? 'provided' : 'unavailable',
  };
}

export function getVehicleLabel(report) {
  const v = getVehicleInfo(report);
  const parts = [v.year, v.make, v.model].filter(Boolean);
  return parts.length ? parts.join(' ') : 'Vehicle not specified';
}

/* ── fault codes ────────────────────────────────────────────── */

const EMPTY_CODES = {
  dtc_status: 'unknown',
  active_codes: [],
  history_codes: [],
  notes: null,
};

export function getFaultCodes(report) {
  if (!report) return { ...EMPTY_CODES, active_codes: [], history_codes: [] };
  const rd = getReportPayload(report);

  if (isNewFormatReport(report) && rd.fault_codes) {
    return {
      dtc_status: rd.fault_codes.dtc_status || 'unknown',
      active_codes: rd.fault_codes.active_codes || [],
      history_codes: rd.fault_codes.history_codes || [],
      notes: rd.fault_codes.notes || null,
    };
  }

  const legacy = report.error_codes_analysis || [];
  return {
    dtc_status: legacy.length > 0 ? 'active_reported' : 'unknown',
    active_codes: legacy.map(c => ({
      raw_code: c.code || c.raw_code || '?',
      module: c.module || null,
      system: c.system || null,
      status: 'active',
      notes: c.description || c.notes || null,
    })),
    history_codes: [],
    notes: null,
  };
}

export function getActiveCodeCount(report) {
  return getFaultCodes(report).active_codes.length;
}

/* ── urgency / severity ─────────────────────────────────────── */

export function getReportUrgency(report) {
  if (!report) return null;
  const rd = getReportPayload(report);
  return rd.severity_triage?.overall_urgency || null;
}

export function getSeverityTriage(report) {
  const rd = getReportPayload(report);
  if (!rd.severity_triage) return null;
  return {
    overall_urgency: rd.severity_triage.overall_urgency || 'medium',
    tow_recommended: rd.severity_triage.tow_recommended ?? false,
    can_drive: !rd.severity_triage.tow_recommended,
    do_not_drive_conditions: rd.severity_triage.do_not_drive_conditions || [],
  };
}

/* ── summary ────────────────────────────────────────────────── */

export function getReportSummary(report) {
  if (!report) return '';
  const rd = getReportPayload(report);
  if (isNewFormatReport(report)) {
    return (
      rd.conclusions?.[0]?.statement ||
      rd.verified_facts?.[0] ||
      report.diagnosis_summary ||
      'Intake & Triage Report'
    );
  }
  return report.diagnosis_summary || '';
}

/* ── structured detail getters ──────────────────────────────── */

export function getVerifiedFacts(report) {
  return getReportPayload(report).verified_facts || [];
}

export function getHypotheses(report) {
  if (isNewFormatReport(report)) {
    return getReportPayload(report).hypotheses || [];
  }
  return (report?.identified_issues || []).map(iss => ({
    possible_cause: iss.issue || iss.possible_cause || '',
    confidence: iss.confidence === 'high' ? 0.8 : iss.confidence === 'medium' ? 0.5 : 0.3,
    reason: iss.reason || '',
  }));
}

export function getConclusions(report) {
  if (isNewFormatReport(report)) {
    return getReportPayload(report).conclusions || [];
  }
  return (report?.recommendations || []).map((rec, i) => ({
    type: i === 0 ? 'primary' : 'secondary',
    statement: rec,
    confidence: null,
    recommended_action_now: rec,
    success_criteria: '',
    fallback_if_not_confirmed: '',
    escalate_if: [],
    based_on: [],
  }));
}

export function getNextChecks(report) {
  return getReportPayload(report).next_checks || [];
}

export function getMechanicHandoff(report) {
  const rd = getReportPayload(report);
  if (!rd.handoff_to_mechanic) return null;
  return {
    what_to_tell_shop: rd.handoff_to_mechanic.what_to_tell_shop || [],
    questions_for_shop: rd.handoff_to_mechanic.questions_for_shop || [],
  };
}

export function getLimitations(report) {
  return getReportPayload(report).limitations || [];
}

export function getDisclaimer(report) {
  const rd = getReportPayload(report);
  return rd.disclaimer || 'Not a definitive diagnosis. Roadside intake & triage based on reported information.';
}

/* ── evidence ───────────────────────────────────────────────── */

export function getEvidenceSources(report) {
  const rd = getReportPayload(report);
  const ev = rd.evidence || {};
  const sources = [];

  if (getFaultCodes(report).active_codes.length > 0) {
    sources.push({ type: 'fault_codes', label: 'Fault Codes', origin: ev._dataSource || 'user_reported' });
  }
  if (ev.driver_reported_symptoms?.length > 0) {
    sources.push({ type: 'symptoms', label: 'Driver-Reported Symptoms', origin: 'user_reported' });
  }
  if (ev.when_it_happens) {
    sources.push({ type: 'when', label: 'Operating Conditions', origin: 'user_reported' });
  }
  if (ev.recent_events?.length > 0) {
    sources.push({ type: 'events', label: 'Recent Events', origin: 'user_reported' });
  }
  if (ev.dashboard_messages?.length > 0) {
    sources.push({ type: 'dashboard', label: 'Dashboard Messages', origin: 'user_reported' });
  }
  if (ev.checks_already_done?.length > 0) {
    sources.push({ type: 'checks', label: 'Checks Already Done', origin: 'user_reported' });
  }
  if (ev.attachments?.photos) {
    sources.push({ type: 'photo', label: 'Photo Attachment', origin: 'user_reported' });
  }
  if (ev.attachments?.audio) {
    sources.push({ type: 'audio', label: 'Audio Recording', origin: 'user_reported' });
  }
  return sources;
}

export function getEvidence(report) {
  const rd = getReportPayload(report);
  return rd.evidence || null;
}

/* ── metadata ───────────────────────────────────────────────── */

export function getReportMetadata(report) {
  if (!report) return {};
  const rd = getReportPayload(report);
  return {
    schema_version: rd.schema_version || report.schema_version || null,
    normalization_version: rd.normalization_version || report.normalization_version || null,
    model_version: rd.model_version || report.model_version || null,
    generation_timestamp: rd.generated_at_iso || report.generation_timestamp || null,
    report_type: rd.report_type || report.report_type || null,
    created_at: report.created_date || report.created_at || null,
  };
}

/* ── executive summary (derived) ────────────────────────────── */

export function getExecutiveSummary(report) {
  const triage = getSeverityTriage(report);
  const conclusions = getConclusions(report);
  const primary = conclusions.find(c => c.type === 'primary');

  return {
    can_drive: triage?.can_drive ?? null,
    tow_recommended: triage?.tow_recommended ?? false,
    urgency: triage?.overall_urgency ?? null,
    primary_subsystem: primary?.based_on?.[0] || null,
    action_now: primary?.recommended_action_now || null,
    confidence: primary?.confidence ?? null,
    summary: getReportSummary(report),
  };
}
