/**
 * ChatBridge — Formats truck state snapshot for diagnostic chat context
 *
 * Converts the raw snapshot + AI interpretation into a human-readable
 * context block that can be prepended to the diagnostic chat prompt.
 * This allows the AI diagnostic assistant to have full truck computer
 * awareness when answering user questions.
 */

/**
 * Format a snapshot + interpretation for injection into chat context.
 *
 * @param {Object} snapshot - Raw vehicle system snapshot
 * @param {Object} interpretation - Improbability Drive AI interpretation
 * @param {Object} [truckContext] - Truck make/model/year context
 * @returns {string} Formatted context string for the diagnostic AI
 */
export function formatForChat(snapshot, interpretation, truckContext) {
  const lines = [];

  lines.push('=== TRUCK COMPUTER STATE (live telematics) ===');
  lines.push('');

  // Truck ID
  if (truckContext) {
    const parts = [truckContext.year, truckContext.make, truckContext.model].filter(Boolean);
    if (parts.length) lines.push(`Vehicle: ${parts.join(' ')}`);
    if (truckContext.vin) lines.push(`VIN: ${truckContext.vin}`);
    if (truckContext.engine_type) lines.push(`Engine: ${truckContext.engine_type}`);
  }

  // Overall status
  lines.push(`\nOverall Status: ${snapshot?.summary_status?.toUpperCase() || 'UNKNOWN'}`);

  if (interpretation?.overall_assessment) {
    const oa = interpretation.overall_assessment;
    lines.push(`System Assessment: ${oa.severity} — ${oa.safe_to_drive ? 'SAFE TO DRIVE' : '⚠️ NOT SAFE TO DRIVE'}`);
    lines.push(`Summary: ${oa.summary}`);
    if (oa.immediate_actions?.length) {
      lines.push('Immediate Actions:');
      oa.immediate_actions.forEach((a, i) => lines.push(`  ${i + 1}. ${a}`));
    }
  }

  // Active fault codes
  const activeFaults = snapshot?.active_faults || [];
  if (activeFaults.length > 0) {
    lines.push(`\n--- Active Fault Codes (${activeFaults.length}) ---`);
    for (const f of activeFaults) {
      const code = f.dtc || f.oem_code || `SPN ${f.spn} / FMI ${f.fmi}`;
      lines.push(`  [${f.severity?.toUpperCase()}] ${f.code_type}: ${code}`);
      lines.push(`    First seen: ${f.first_seen_at}, Last: ${f.last_seen_at}`);
    }
  }

  // Recurring faults
  const recurring = snapshot?.recurring_faults || [];
  if (recurring.length > 0) {
    lines.push(`\n--- Recurring Faults (${recurring.length}) ---`);
    for (const r of recurring) {
      const code = r.dtc || `SPN ${r.spn} / FMI ${r.fmi}`;
      lines.push(`  ⟳ ${code} — ${r.occurrences} occurrences in 72h`);
    }
  }

  // Key signals
  const signals = snapshot?.current_signals || {};
  const signalEntries = Object.entries(signals);
  if (signalEntries.length > 0) {
    lines.push('\n--- Current Vehicle Signals ---');
    for (const [name, s] of signalEntries) {
      const val = typeof s.value === 'boolean' ? (s.value ? 'ON' : 'OFF') : s.value;
      lines.push(`  ${name}: ${val}${s.unit ? ` ${s.unit}` : ''}`);
    }
  }

  // Signal anomalies from AI
  if (interpretation?.signal_anomalies?.length) {
    lines.push('\n--- Signal Anomalies (Auto-detected) ---');
    for (const a of interpretation.signal_anomalies) {
      lines.push(`  [${a.concern_level?.toUpperCase()}] ${a.signal_name}: ${a.current_value} — ${a.note}`);
    }
  }

  // Patterns from AI
  if (interpretation?.patterns_detected?.length) {
    lines.push('\n--- Patterns Detected ---');
    for (const p of interpretation.patterns_detected) {
      lines.push(`  [${p.risk_level?.toUpperCase()}] ${p.pattern_type}: ${p.description}`);
    }
  }

  // Open defects
  const defects = snapshot?.open_defects || [];
  if (defects.length > 0) {
    lines.push(`\n--- Open Inspection Defects (${defects.length}) ---`);
    for (const d of defects) {
      lines.push(`  [${d.severity?.toUpperCase()}] ${d.defect_type}: ${d.notes || 'No notes'}`);
    }
  }

  // Cleared faults
  const cleared = snapshot?.cleared_faults_72h || [];
  if (cleared.length > 0) {
    lines.push(`\n--- Recently Cleared Faults (${cleared.length} in 72h) ---`);
    for (const f of cleared.slice(0, 10)) {
      const code = f.dtc || `SPN ${f.spn} / FMI ${f.fmi}`;
      lines.push(`  ✓ ${code} (cleared, was ${f.severity})`);
    }
    if (cleared.length > 10) lines.push(`  ... and ${cleared.length - 10} more`);
  }

  lines.push('');
  lines.push('=== END TRUCK COMPUTER STATE ===');
  lines.push('Use this data to inform your diagnostic response. Reference specific codes and signals.');

  return lines.join('\n');
}

/**
 * Create a short status badge text for the UI.
 */
export function formatStatusBadge(snapshot, interpretation) {
  if (!snapshot) return { text: 'No Data', color: 'gray' };

  const status = snapshot.summary_status || 'unknown';
  const faultCount = snapshot.stats?.total_active_faults || 0;

  const colorMap = {
    green: 'green',
    amber: 'yellow',
    red: 'red',
    unknown: 'gray',
  };

  let text = '';
  if (status === 'green') text = 'All Systems OK';
  else if (status === 'amber') text = `${faultCount} Warning${faultCount !== 1 ? 's' : ''}`;
  else if (status === 'red') text = `${faultCount} Critical Fault${faultCount !== 1 ? 's' : ''}`;
  else text = 'Unknown';

  if (interpretation?.overall_assessment?.safe_to_drive === false) {
    text += ' — NOT SAFE';
  }

  return { text, color: colorMap[status] || 'gray', status };
}
