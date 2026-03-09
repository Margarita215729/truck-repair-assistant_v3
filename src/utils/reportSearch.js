/**
 * Report search utilities.
 *
 * Builds a flat text index from both legacy and new-format reports
 * so the search box and filters can work on a single code path.
 */

import {
  getReportSummary,
  getVehicleInfo,
  getFaultCodes,
  getReportUrgency,
  getVerifiedFacts,
  getConclusions,
  getHypotheses,
  getReportFormat,
  getSeverityTriage,
} from './reportAdapters';

/**
 * Build a lowercased search blob for a single report.
 * Called once per report, cached by the caller (useQuery data is stable).
 */
export function buildReportSearchIndex(report) {
  if (!report) return '';
  const v = getVehicleInfo(report);
  const codes = getFaultCodes(report);
  const facts = getVerifiedFacts(report);
  const conclusions = getConclusions(report);
  const hypotheses = getHypotheses(report);

  const parts = [
    getReportSummary(report),
    v.year, v.make, v.model, v.engine, v.vin,
    codes.active_codes.map(c => c.raw_code).join(' '),
    codes.history_codes.map(c => c.raw_code).join(' '),
    ...facts,
    ...conclusions.map(c => c.statement),
    ...hypotheses.map(h => h.possible_cause),
    report.diagnosis_summary,
  ];

  return parts.filter(Boolean).join(' ').toLowerCase();
}

/**
 * Check if a report matches a free-text query.
 * Each whitespace-separated token must appear somewhere in the index.
 */
export function matchesReportSearch(report, query) {
  if (!query || !query.trim()) return true;
  const index = buildReportSearchIndex(report);
  const tokens = query.toLowerCase().trim().split(/\s+/);
  return tokens.every(t => index.includes(t));
}

/**
 * Apply structured filters (beyond free-text search).
 *
 * filterState shape:
 *   { urgency, hasTow, canDrive, format, hasCodes, truckMake, dateFrom, dateTo }
 *
 * Every field is optional. null/undefined = "any".
 */
export function matchesReportFilters(report, filters) {
  if (!filters) return true;

  // Urgency
  if (filters.urgency) {
    const u = getReportUrgency(report);
    if (u !== filters.urgency) return false;
  }

  // Tow
  if (filters.hasTow === true) {
    const triage = getSeverityTriage(report);
    if (!triage?.tow_recommended) return false;
  } else if (filters.hasTow === false) {
    const triage = getSeverityTriage(report);
    if (triage?.tow_recommended) return false;
  }

  // Can drive
  if (filters.canDrive === true) {
    const triage = getSeverityTriage(report);
    if (triage && !triage.can_drive) return false;
  } else if (filters.canDrive === false) {
    const triage = getSeverityTriage(report);
    if (!triage || triage.can_drive) return false;
  }

  // Format
  if (filters.format) {
    if (getReportFormat(report) !== filters.format) return false;
  }

  // Has active codes
  if (filters.hasCodes === true) {
    if (getFaultCodes(report).active_codes.length === 0) return false;
  } else if (filters.hasCodes === false) {
    if (getFaultCodes(report).active_codes.length > 0) return false;
  }

  // Truck make
  if (filters.truckMake) {
    const v = getVehicleInfo(report);
    if (!v.make || v.make.toLowerCase() !== filters.truckMake.toLowerCase()) return false;
  }

  // Date range
  const reportDate = report.created_date || report.created_at;
  if (filters.dateFrom && reportDate) {
    if (new Date(reportDate) < new Date(filters.dateFrom)) return false;
  }
  if (filters.dateTo && reportDate) {
    if (new Date(reportDate) > new Date(filters.dateTo)) return false;
  }

  return true;
}
