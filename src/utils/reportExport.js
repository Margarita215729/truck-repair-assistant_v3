/**
 * Report export utilities.
 *
 * Extracted from ReportDetail.jsx to be reusable across components.
 * Uses reportAdapters so both legacy and new-format reports export cleanly.
 */

import jsPDF from 'jspdf';
import { format } from 'date-fns';
import {
  getVehicleInfo,
  getVehicleLabel,
  getFaultCodes,
  getVerifiedFacts,
  getConclusions,
  getHypotheses,
  getNextChecks,
  getSeverityTriage,
  getMechanicHandoff,
  getLimitations,
  getEvidence,
  getReportSummary,
  getDisclaimer,
  getReportMetadata,
  isNewFormatReport,
} from './reportAdapters';

/* ─── helpers ────────────────────────────────────────────────── */

function fmtConf(val) {
  if (typeof val !== 'number') return val || '—';
  const pct = val > 1 ? Math.round(val) : Math.round(val * 100);
  return `${Math.min(pct, 100)}%`;
}

const dtcStatusLabels = {
  active_reported: 'Active fault codes reported',
  active_present: 'Active fault codes present',
  history_only: 'History/inactive codes only',
  none_reported: 'No active fault codes reported',
  unavailable: 'Fault code data unavailable',
  unknown: 'Fault code status unknown',
};

const vinStatusLabels = {
  provided: 'VIN provided',
  invalid: 'VIN format invalid',
  unavailable: 'VIN not available',
  unknown: 'VIN status unknown',
};

function reportDateStr(report) {
  return format(
    new Date(report.created_date || report.created_at || Date.now()),
    'MMMM d, yyyy h:mm a',
  );
}

function fileDate(report) {
  return format(
    new Date(report.created_date || report.created_at || Date.now()),
    'yyyy-MM-dd',
  );
}

/* ─── text export ────────────────────────────────────────────── */

export function buildTextExport(report) {
  const lines = [];
  lines.push('INTAKE & TRIAGE REPORT');
  lines.push(`Generated: ${reportDateStr(report)}`);
  lines.push(`Disclaimer: ${getDisclaimer(report)}`);
  lines.push('');

  // Vehicle
  const v = getVehicleInfo(report);
  lines.push('VEHICLE INFORMATION');
  lines.push(`  ${getVehicleLabel(report)}`);
  if (v.engine) lines.push(`  Engine: ${v.engine}`);
  if (v.mileage) lines.push(`  Mileage: ${v.mileage}`);
  lines.push(`  VIN: ${v.vin || 'Not available'} (${vinStatusLabels[v.vin_status] || v.vin_status})`);
  lines.push('');

  // Fault codes
  const fc = getFaultCodes(report);
  lines.push('FAULT CODES');
  lines.push(`  Status: ${dtcStatusLabels[fc.dtc_status] || fc.dtc_status}`);
  fc.active_codes.forEach(c => lines.push(`  [ACTIVE] ${c.raw_code}${c.notes ? ` — ${c.notes}` : ''}`));
  fc.history_codes.forEach(c => lines.push(`  [HISTORY] ${c.raw_code}${c.notes ? ` — ${c.notes}` : ''}`));
  lines.push('');

  // Evidence
  const ev = getEvidence(report);
  if (ev) {
    lines.push('EVIDENCE & CONTEXT');
    if (ev.driver_reported_symptoms?.length) lines.push(`  Symptoms: ${ev.driver_reported_symptoms.join(', ')}`);
    if (ev.when_it_happens) lines.push(`  When: ${ev.when_it_happens}`);
    if (ev.recent_events?.length) lines.push(`  Recent events: ${ev.recent_events.join(', ')}`);
    if (ev.dashboard_messages?.length) lines.push(`  Dashboard: ${ev.dashboard_messages.join(', ')}`);
    if (ev.checks_already_done?.length) lines.push(`  Already checked: ${ev.checks_already_done.join('; ')}`);
    lines.push('');
  }

  // Verified facts
  const facts = getVerifiedFacts(report);
  if (facts.length) {
    lines.push('VERIFIED FACTS');
    facts.forEach(f => lines.push(`  ✓ ${f}`));
    lines.push('');
  }

  // Hypotheses
  const hyps = getHypotheses(report);
  if (hyps.length) {
    lines.push('HYPOTHESES');
    hyps.forEach((h, i) => {
      lines.push(`  ${i + 1}. ${h.possible_cause} (confidence: ${fmtConf(h.confidence)})`);
      if (h.reason) lines.push(`     Reason: ${h.reason}`);
    });
    lines.push('');
  }

  // Conclusions
  const conclusions = getConclusions(report);
  if (conclusions.length) {
    lines.push('CONCLUSIONS');
    conclusions.forEach((c, i) => {
      lines.push(`  ${i + 1}. [${(c.type || 'info').toUpperCase()}] ${c.statement}`);
      if (c.confidence != null) lines.push(`     Confidence: ${fmtConf(c.confidence)}`);
      if (c.recommended_action_now) lines.push(`     Action now: ${c.recommended_action_now}`);
      if (c.success_criteria) lines.push(`     Success if: ${c.success_criteria}`);
      if (c.fallback_if_not_confirmed) lines.push(`     Fallback: ${c.fallback_if_not_confirmed}`);
      if (c.escalate_if?.length) lines.push(`     Escalate if: ${c.escalate_if.join('; ')}`);
    });
    lines.push('');
  }

  // Next checks
  const checks = getNextChecks(report);
  if (checks.length) {
    lines.push('NEXT CHECKS');
    checks.forEach(ck => {
      lines.push(`  Step ${ck.step}: ${ck.action}`);
      lines.push(`    Why: ${ck.why}`);
      lines.push(`    How: ${ck.how}`);
      lines.push(`    Expected: ${ck.expected_result}`);
      lines.push(`    If failed: ${ck.if_failed_next}`);
    });
    lines.push('');
  }

  // Severity
  const triage = getSeverityTriage(report);
  if (triage) {
    lines.push('SEVERITY TRIAGE');
    lines.push(`  Urgency: ${(triage.overall_urgency || '').toUpperCase()}`);
    lines.push(`  Tow recommended: ${triage.tow_recommended ? 'YES' : 'No'}`);
    if (triage.do_not_drive_conditions?.length) {
      lines.push('  Do NOT drive if:');
      triage.do_not_drive_conditions.forEach(c => lines.push(`    - ${c}`));
    }
    lines.push('');
  }

  // Handoff
  const handoff = getMechanicHandoff(report);
  if (handoff) {
    lines.push('HANDOFF TO MECHANIC');
    handoff.what_to_tell_shop.forEach(w => lines.push(`  Tell: ${w}`));
    handoff.questions_for_shop.forEach(q => lines.push(`  Ask: ${q}`));
    lines.push('');
  }

  // Limitations
  const lims = getLimitations(report);
  if (lims.length) {
    lines.push('LIMITATIONS');
    lims.forEach(l => lines.push(`  - ${l}`));
  }

  return lines.join('\n');
}

/* ─── download helper ────────────────────────────────────────── */

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ─── public export functions ─────────────────────────────── */

export function exportReportTxt(report) {
  const blob = new Blob([buildTextExport(report)], { type: 'text/plain' });
  downloadBlob(blob, `report-${fileDate(report)}.txt`);
}

export function exportReportPdf(report) {
  try {
    const content = buildTextExport(report);
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const margin = 15;
    const maxWidth = doc.internal.pageSize.getWidth() - margin * 2;
    let y = 20;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('INTAKE & TRIAGE REPORT', margin, y);
    y += 8;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120);
    doc.text(`Generated: ${reportDateStr(report)}`, margin, y);
    doc.setTextColor(0);
    y += 10;

    doc.setFontSize(10);
    for (const line of content.split('\n')) {
      if (y > 275) { doc.addPage(); y = 15; }
      const isHeader = line === line.toUpperCase() && line.trim().length > 2 && !line.startsWith(' ');
      if (isHeader) {
        y += 3;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
      }
      const wrapped = doc.splitTextToSize(line || ' ', maxWidth);
      for (const wl of wrapped) {
        if (y > 275) { doc.addPage(); y = 15; }
        doc.text(wl, margin, y);
        y += isHeader ? 5.5 : 4.2;
      }
    }

    doc.save(`report-${fileDate(report)}.pdf`);
  } catch (err) {
    console.error('PDF export failed:', err);
    exportReportTxt(report);
  }
}

export function exportMechanicHandoffPdf(report) {
  try {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const margin = 15;
    const maxW = doc.internal.pageSize.getWidth() - margin * 2;
    let y = 20;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('MECHANIC HANDOFF SHEET', margin, y);
    y += 7;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120);
    doc.text(`Date: ${reportDateStr(report)}`, margin, y);
    doc.setTextColor(0);
    y += 8;

    // Vehicle
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('VEHICLE', margin, y);
    y += 5;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(getVehicleLabel(report), margin, y);
    y += 5;
    const v = getVehicleInfo(report);
    if (v.vin) { doc.text(`VIN: ${v.vin}`, margin, y); y += 4; }
    if (v.mileage) { doc.text(`Mileage: ${v.mileage}`, margin, y); y += 4; }
    y += 2;

    // Triage
    const triage = getSeverityTriage(report);
    if (triage) {
      doc.setFontSize(11); doc.setFont('helvetica', 'bold');
      doc.text('TRIAGE', margin, y); y += 5;
      doc.setFontSize(9); doc.setFont('helvetica', 'normal');
      doc.text(`Urgency: ${(triage.overall_urgency || '').toUpperCase()}`, margin, y); y += 4;
      doc.text(`Tow: ${triage.tow_recommended ? 'YES' : 'No'}`, margin, y); y += 6;
    }

    // Codes
    const fc = getFaultCodes(report);
    if (fc.active_codes.length) {
      doc.setFontSize(11); doc.setFont('helvetica', 'bold');
      doc.text('ACTIVE FAULT CODES', margin, y); y += 5;
      doc.setFontSize(9); doc.setFont('helvetica', 'normal');
      fc.active_codes.forEach(c => {
        const txt = `${c.raw_code}${c.notes ? ' — ' + c.notes : ''}`;
        const wrapped = doc.splitTextToSize(txt, maxW);
        for (const wl of wrapped) { if (y > 275) { doc.addPage(); y = 15; } doc.text(wl, margin, y); y += 4; }
      });
      y += 2;
    }

    // Conclusions
    const conclusions = getConclusions(report);
    if (conclusions.length) {
      doc.setFontSize(11); doc.setFont('helvetica', 'bold');
      doc.text('CONCLUSIONS', margin, y); y += 5;
      doc.setFontSize(9); doc.setFont('helvetica', 'normal');
      conclusions.forEach((c, i) => {
        const txt = `${i + 1}. ${c.statement}`;
        const wrapped = doc.splitTextToSize(txt, maxW);
        for (const wl of wrapped) { if (y > 275) { doc.addPage(); y = 15; } doc.text(wl, margin, y); y += 4; }
        if (c.recommended_action_now) {
          const act = `   Action: ${c.recommended_action_now}`;
          const aw = doc.splitTextToSize(act, maxW);
          for (const wl of aw) { if (y > 275) { doc.addPage(); y = 15; } doc.text(wl, margin, y); y += 4; }
        }
      });
      y += 2;
    }

    // Handoff notes
    const handoff = getMechanicHandoff(report);
    if (handoff) {
      doc.setFontSize(11); doc.setFont('helvetica', 'bold');
      doc.text('WHAT TO TELL THE SHOP', margin, y); y += 5;
      doc.setFontSize(9); doc.setFont('helvetica', 'normal');
      handoff.what_to_tell_shop.forEach(w => {
        const wrapped = doc.splitTextToSize(`• ${w}`, maxW);
        for (const wl of wrapped) { if (y > 275) { doc.addPage(); y = 15; } doc.text(wl, margin, y); y += 4; }
      });
      y += 2;
      if (handoff.questions_for_shop.length) {
        doc.setFontSize(11); doc.setFont('helvetica', 'bold');
        doc.text('QUESTIONS TO ASK', margin, y); y += 5;
        doc.setFontSize(9); doc.setFont('helvetica', 'normal');
        handoff.questions_for_shop.forEach(q => {
          const wrapped = doc.splitTextToSize(`? ${q}`, maxW);
          for (const wl of wrapped) { if (y > 275) { doc.addPage(); y = 15; } doc.text(wl, margin, y); y += 4; }
        });
      }
    }

    doc.save(`handoff-${fileDate(report)}.pdf`);
  } catch (err) {
    console.error('Handoff PDF export failed:', err);
    exportReportTxt(report);
  }
}

export function exportReportHtml(report) {
  const content = buildTextExport(report);
  const dateStr = reportDateStr(report);
  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>Report ${fileDate(report)}</title>
<style>
  body{font-family:system-ui,sans-serif;font-size:11pt;line-height:1.6;color:#222;max-width:800px;margin:2rem auto;padding:0 1rem}
  h1{font-size:18pt;color:#d35400;border-bottom:2px solid #d35400;padding-bottom:4pt}
  .meta{color:#888;font-size:9pt}
  pre{font-family:Consolas,monospace;font-size:9pt;white-space:pre-wrap;background:#f8f8f8;padding:1rem;border:1px solid #ddd;border-radius:6px}
  @media print{body{margin:0}}
</style></head>
<body>
<h1>INTAKE &amp; TRIAGE REPORT</h1>
<p class="meta">Generated: ${dateStr}</p>
<pre>${content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
</body></html>`;

  const blob = new Blob([html], { type: 'text/html' });
  downloadBlob(blob, `report-${fileDate(report)}.html`);
}

export function exportReportDoc(report) {
  try {
    const content = buildTextExport(report);
    const dateStr = reportDateStr(report);
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8">
<style>
  body{font-family:Calibri,Arial,sans-serif;font-size:11pt;line-height:1.5;color:#222;margin:2cm}
  h1{font-size:18pt;color:#d35400;border-bottom:2px solid #d35400;padding-bottom:4pt}
  h2{font-size:13pt;color:#333;margin-top:14pt}
  pre{font-family:Consolas,monospace;font-size:9pt;white-space:pre-wrap;background:#f8f8f8;padding:8pt;border:1px solid #ddd;border-radius:4pt}
  .meta{color:#888;font-size:9pt}
</style></head>
<body>
<h1>INTAKE &amp; TRIAGE REPORT</h1>
<p class="meta">Generated: ${dateStr}</p>
<pre>${content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
</body></html>`;
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    downloadBlob(blob, `report-${fileDate(report)}.doc`);
  } catch (err) {
    console.error('DOC export failed:', err);
    exportReportTxt(report);
  }
}
