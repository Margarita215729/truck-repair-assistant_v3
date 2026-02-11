import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, 
  Truck, 
  AlertCircle, 
  Download,
  CheckCircle,
  AlertTriangle,
  Clock,
  Shield,
  ArrowRight,
  MessageSquare,
  HelpCircle,
  XCircle,
  Info,
  FileDown,
  ChevronDown
} from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';

const urgencyConfig = {
  high: { icon: AlertCircle, color: 'text-red-500 bg-red-500/20 border-red-500/30', label: 'HIGH' },
  medium: { icon: AlertTriangle, color: 'text-yellow-500 bg-yellow-500/20 border-yellow-500/30', label: 'MEDIUM' },
  low: { icon: Clock, color: 'text-blue-500 bg-blue-500/20 border-blue-500/30', label: 'LOW' }
};

/** Normalize confidence: handles both 0.85 (decimal) and 85 (percent) */
function fmtConf(val) {
  if (typeof val !== 'number') return val || '—';
  const pct = val > 1 ? Math.round(val) : Math.round(val * 100);
  return `${Math.min(pct, 100)}%`;
}

const dtcStatusLabels = {
  active_reported: 'Active fault codes reported',
  history_only: 'History/inactive codes only',
  none_reported: 'No active fault codes reported',
  unknown: 'Fault code status unknown',
};

const vinStatusLabels = {
  provided: 'VIN provided',
  unavailable: 'VIN not available',
  unknown: 'VIN status unknown',
};

export default function ReportDetail({ report, open, onClose }) {
  const [showExportMenu, setShowExportMenu] = useState(false);
  if (!report) return null;

  // Support both old and new report formats
  const rd = report.report_data || {};
  const isNewFormat = rd.report_type === 'INTAKE_Triage_Roadside';

  const getTextContent = () => isNewFormat ? buildTriageExport(report, rd) : buildLegacyExport(report);

  const fileDate = format(new Date(report.created_date || report.created_at || Date.now()), 'yyyy-MM-dd');

  const downloadFile = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const handleExportTxt = () => {
    const blob = new Blob([getTextContent()], { type: 'text/plain' });
    downloadFile(blob, `report-${fileDate}.txt`);
  };

  const handleExportPdf = () => {
    try {
      const content = getTextContent();
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      const maxWidth = pageWidth - margin * 2;
      let y = 20;

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('INTAKE & TRIAGE REPORT', margin, y);
      y += 8;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120);
      doc.text(`Generated: ${format(new Date(report.created_date || report.created_at || Date.now()), 'MMMM d, yyyy h:mm a')}`, margin, y);
      doc.setTextColor(0);
      y += 10;

      doc.setFontSize(10);
      const lines = content.split('\n');
      for (const line of lines) {
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

      doc.save(`report-${fileDate}.pdf`);
      setShowExportMenu(false);
    } catch (err) {
      console.error('PDF export failed:', err);
      handleExportTxt(); // fallback
    }
  };

  const handleExportDocx = () => {
    try {
      const content = getTextContent();
      const reportDateStr = format(new Date(report.created_date || report.created_at || Date.now()), 'MMMM d, yyyy h:mm a');

      // Build simple HTML-based DOCX (Word accepts HTML in .doc)
      const html = `
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8">
<style>
  body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; line-height: 1.5; color: #222; margin: 2cm; }
  h1 { font-size: 18pt; color: #d35400; border-bottom: 2px solid #d35400; padding-bottom: 4pt; }
  h2 { font-size: 13pt; color: #333; margin-top: 14pt; }
  pre { font-family: Consolas, monospace; font-size: 9pt; white-space: pre-wrap; background: #f8f8f8; padding: 8pt; border: 1px solid #ddd; border-radius: 4pt; }
  .meta { color: #888; font-size: 9pt; }
</style></head>
<body>
<h1>INTAKE &amp; TRIAGE REPORT</h1>
<p class="meta">Generated: ${reportDateStr}</p>
<pre>${content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
</body></html>`;

      const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
      downloadFile(blob, `report-${fileDate}.doc`);
    } catch (err) {
      console.error('DOCX export failed:', err);
      handleExportTxt();
    }
  };

  const reportDate = report.created_date || report.created_at || Date.now();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#141414] border-white/10 text-white max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-600/20 flex items-center justify-center">
                <FileText className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <span className="text-lg">INTAKE & TRIAGE REPORT (Roadside)</span>
                <p className="text-sm font-normal text-white/50">
                  {format(new Date(reportDate), 'MMM d, yyyy h:mm a')}
                </p>
              </div>
            </div>
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="border-white/20 hover:bg-white/10"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
                <ChevronDown className="w-3 h-3 ml-1" />
              </Button>
              {showExportMenu && (
                <div className="absolute right-0 top-full mt-1 z-50 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-xl py-1 min-w-[140px]">
                  <button onClick={handleExportPdf} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/80 hover:bg-white/10 transition-colors">
                    <FileDown className="w-4 h-4 text-red-400" /> PDF
                  </button>
                  <button onClick={handleExportDocx} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/80 hover:bg-white/10 transition-colors">
                    <FileDown className="w-4 h-4 text-blue-400" /> Word (.doc)
                  </button>
                  <button onClick={handleExportTxt} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/80 hover:bg-white/10 transition-colors">
                    <FileText className="w-4 h-4 text-white/40" /> Text (.txt)
                  </button>
                </div>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 pr-2 pt-4">
          {/* Disclaimer */}
          <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-xs text-yellow-300/80 flex items-start gap-2">
            <Shield className="w-4 h-4 shrink-0 mt-0.5" />
            {rd.disclaimer || 'Not a definitive diagnosis. Roadside intake & triage based on reported information.'}
          </div>

          {/* Severity Triage Banner */}
          {rd.severity_triage && (
            <SeverityBanner triage={rd.severity_triage} />
          )}

          {/* 1. Vehicle Info */}
          <Section icon={Truck} title="Vehicle Information">
            <VehicleInfo info={rd.vehicle_info || report.truck_info} />
          </Section>

          {/* 2. Fault Codes */}
          <Section icon={AlertCircle} title="Fault Codes">
            <FaultCodesSection codes={rd.fault_codes} legacy={report.error_codes_analysis} />
          </Section>

          {/* 3. Evidence & Context */}
          {rd.evidence && (
            <Section icon={Info} title="Evidence & Context">
              <EvidenceSection evidence={rd.evidence} />
            </Section>
          )}

          {/* 4. Verified Facts */}
          {rd.verified_facts?.length > 0 && (
            <Section icon={CheckCircle} title="Verified Facts">
              <ul className="space-y-1.5">
                {rd.verified_facts.map((fact, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-white/80">
                    <CheckCircle className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                    {fact}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* 5. Conclusions (HIGHLIGHTED) */}
          {rd.conclusions?.length > 0 && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-orange-500/10 to-orange-600/10 border border-orange-500/30">
              <h3 className="text-sm font-bold text-orange-400 mb-3 flex items-center gap-2">
                <ArrowRight className="w-4 h-4" />
                CONCLUSIONS — What To Do
              </h3>
              <div className="space-y-4">
                {rd.conclusions.map((c, i) => (
                  <div key={i} className="p-3 bg-black/30 rounded-lg border border-white/10">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={c.type === 'primary' ? 'bg-orange-500/30 text-orange-300 border-orange-500/40' : 'bg-white/10 text-white/60 border-white/20'}>
                        {c.type === 'primary' ? 'PRIMARY' : 'SECONDARY'}
                      </Badge>
                      <Badge variant="outline" className="border-white/20 text-white/50 text-xs">
                        Confidence: {fmtConf(c.confidence)}
                      </Badge>
                    </div>
                    <p className="text-white font-medium mb-2">{c.statement}</p>
                    <div className="space-y-1 text-xs text-white/60">
                      <p><span className="text-orange-400/80">Action now:</span> {c.recommended_action_now}</p>
                      <p><span className="text-green-400/80">Success if:</span> {c.success_criteria}</p>
                      <p><span className="text-yellow-400/80">Fallback:</span> {c.fallback_if_not_confirmed}</p>
                      {c.escalate_if?.length > 0 && (
                        <p><span className="text-red-400/80">Escalate if:</span> {c.escalate_if.join('; ')}</p>
                      )}
                      {c.based_on?.length > 0 && (
                        <p className="text-white/40 mt-1">Based on: {c.based_on.join(', ')}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hypotheses */}
          {rd.hypotheses?.length > 0 && (
            <Section icon={HelpCircle} title="Hypotheses">
              <div className="space-y-2">
                {rd.hypotheses.map((h, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
                    <div className="text-lg font-bold text-white/30 w-6 text-center">{i + 1}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-white/90 font-medium">{h.possible_cause}</p>
                        <Badge variant="outline" className="border-white/20 text-white/50 text-xs">
                          {fmtConf(h.confidence)}
                        </Badge>
                      </div>
                      <p className="text-xs text-white/50">{h.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* 6. Next Checks */}
          {rd.next_checks?.length > 0 && (
            <Section icon={CheckCircle} title="Next Checks (cheapest / fastest first)">
              <div className="space-y-3">
                {rd.next_checks.map((check, i) => (
                  <div key={i} className="p-3 bg-white/5 rounded-lg border border-white/10">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-xs font-bold">
                        {check.step || i + 1}
                      </div>
                      <p className="text-white font-medium text-sm">{check.action}</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs text-white/60 pl-8">
                      <p><span className="text-white/40">Why:</span> {check.why}</p>
                      <p><span className="text-white/40">How:</span> {check.how}</p>
                      <p><span className="text-white/40">Expected:</span> {check.expected_result}</p>
                      <p><span className="text-white/40">If failed:</span> {check.if_failed_next}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* 7. Severity & Tow */}
          {rd.severity_triage && (
            <Section icon={AlertTriangle} title="Severity & Tow Recommendation">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-white/60">Urgency:</span>
                  {(() => {
                    const cfg = urgencyConfig[rd.severity_triage.overall_urgency] || urgencyConfig.medium;
                    const Icon = cfg.icon;
                    return (
                      <Badge className={`${cfg.color} border`}>
                        <Icon className="w-3 h-3 mr-1" />
                        {cfg.label}
                      </Badge>
                    );
                  })()}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-white/60">Tow recommended:</span>
                  <Badge className={rd.severity_triage.tow_recommended
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : 'bg-green-500/20 text-green-400 border border-green-500/30'
                  }>
                    {rd.severity_triage.tow_recommended ? 'YES — Tow recommended' : 'No — May not need tow'}
                  </Badge>
                </div>
                {rd.severity_triage.do_not_drive_conditions?.length > 0 && (
                  <div>
                    <p className="text-xs text-red-400 font-medium mb-1">Do NOT drive if:</p>
                    <ul className="space-y-1">
                      {rd.severity_triage.do_not_drive_conditions.map((cond, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-red-300/80">
                          <XCircle className="w-3 h-3 shrink-0 mt-0.5" />
                          {cond}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* 8. Handoff to Mechanic */}
          {rd.handoff_to_mechanic && (
            <Section icon={MessageSquare} title="Handoff to Mechanic">
              <div className="space-y-3">
                {rd.handoff_to_mechanic.what_to_tell_shop?.length > 0 && (
                  <div>
                    <p className="text-xs text-white/50 mb-1.5 font-medium">What to tell the shop:</p>
                    <ul className="space-y-1">
                      {rd.handoff_to_mechanic.what_to_tell_shop.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-white/80">
                          <ArrowRight className="w-3 h-3 text-orange-400 shrink-0 mt-1" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {rd.handoff_to_mechanic.questions_for_shop?.length > 0 && (
                  <div>
                    <p className="text-xs text-white/50 mb-1.5 font-medium">Questions to ask:</p>
                    <ul className="space-y-1">
                      {rd.handoff_to_mechanic.questions_for_shop.map((q, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-white/80">
                          <HelpCircle className="w-3 h-3 text-blue-400 shrink-0 mt-1" />
                          {q}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* 9. Limitations */}
          {rd.limitations?.length > 0 && (
            <Section icon={Info} title="Limitations">
              <ul className="space-y-1">
                {rd.limitations.map((lim, i) => (
                  <li key={i} className="text-xs text-white/50 flex items-start gap-2">
                    <span className="text-white/30">•</span>
                    {lim}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* LEGACY — old-format issues/recommendations/costs/sources */}
          {!isNewFormat && <LegacySections report={report} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ============ Sub-components ============ */

function Section({ icon: Icon, title, children }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-white/60 mb-3 flex items-center gap-2">
        <Icon className="w-4 h-4" />
        {title}
      </h3>
      {children}
    </div>
  );
}

function SeverityBanner({ triage }) {
  const cfg = urgencyConfig[triage.overall_urgency] || urgencyConfig.medium;
  const Icon = cfg.icon;
  return (
    <div className={`p-3 rounded-xl ${cfg.color} border flex items-center gap-3`}>
      <Icon className="w-5 h-5 shrink-0" />
      <div>
        <p className="font-semibold text-sm">Urgency: {cfg.label}</p>
        {triage.tow_recommended && (
          <p className="text-xs mt-0.5 opacity-80">Tow is recommended. Do not attempt to drive.</p>
        )}
      </div>
    </div>
  );
}

function VehicleInfo({ info }) {
  if (!info) return <p className="text-sm text-white/40">No vehicle information provided.</p>;
  const vi = info;
  return (
    <div className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-2">
      <p className="text-lg font-semibold text-white">
        {[vi.year_reported || vi.year, vi.make, vi.model].filter(Boolean).join(' ') || 'Vehicle not specified'}
      </p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        {vi.engine && <Detail label="Engine" value={vi.engine} />}
        {vi.transmission && <Detail label="Transmission" value={vi.transmission} />}
        {vi.mileage_reported && <Detail label="Mileage" value={vi.mileage_reported} />}
        <Detail 
          label="VIN" 
          value={vi.vin || '—'} 
          badge={vi.vin_status ? vinStatusLabels[vi.vin_status] : null}
          badgeColor={vi.vin_status === 'provided' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-white/10 text-white/50 border-white/20'}
        />
      </div>
    </div>
  );
}

function Detail({ label, value, badge, badgeColor }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-white/40">{label}:</span>
      <span className="text-white/80">{value}</span>
      {badge && <Badge variant="outline" className={`text-[10px] ${badgeColor}`}>{badge}</Badge>}
    </div>
  );
}

function FaultCodesSection({ codes, legacy }) {
  if (!codes && !legacy?.length) {
    return <p className="text-sm text-white/50">No fault code data in this report.</p>;
  }

  if (codes) {
    return (
      <div className="space-y-3">
        <Badge variant="outline" className={`text-xs ${
          codes.dtc_status === 'active_reported' ? 'border-red-500/40 text-red-400' :
          codes.dtc_status === 'none_reported' ? 'border-green-500/40 text-green-400' :
          'border-white/20 text-white/60'
        }`}>
          {dtcStatusLabels[codes.dtc_status] || codes.dtc_status}
        </Badge>

        {codes.active_codes?.length > 0 && (
          <div className="space-y-2">
            {codes.active_codes.map((c, i) => (
              <div key={i} className="p-3 bg-red-500/5 rounded-lg border border-red-500/20">
                <div className="flex items-center gap-2">
                  <Badge className="bg-red-500/20 text-red-400 border border-red-500/30">{c.raw_code}</Badge>
                  {c.system && <span className="text-xs text-white/40">{c.system}</span>}
                  {c.module && <span className="text-xs text-white/40">({c.module})</span>}
                </div>
                {c.notes && <p className="text-xs text-white/60 mt-1">{c.notes}</p>}
              </div>
            ))}
          </div>
        )}

        {codes.history_codes?.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-white/40 font-medium">History/inactive codes:</p>
            {codes.history_codes.map((c, i) => (
              <div key={i} className="p-2 bg-yellow-500/5 rounded-lg border border-yellow-500/20">
                <Badge className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-xs">{c.raw_code}</Badge>
                {c.notes && <span className="text-xs text-white/50 ml-2">{c.notes}</span>}
              </div>
            ))}
          </div>
        )}

        {codes.notes && <p className="text-xs text-white/50 italic">{codes.notes}</p>}
      </div>
    );
  }

  // Legacy format
  return (
    <div className="space-y-2">
      {legacy.map((code, i) => (
        <div key={i} className="p-3 bg-white/5 rounded-lg border border-white/10">
          <Badge className="bg-red-500/20 text-red-400 border border-red-500/30">{code.code || code.raw_code}</Badge>
          {code.description && <p className="text-xs text-white/60 mt-1">{code.description}</p>}
        </div>
      ))}
    </div>
  );
}

function EvidenceSection({ evidence }) {
  const hasContent = evidence.driver_reported_symptoms?.length > 0 ||
    evidence.when_it_happens ||
    evidence.recent_events?.length > 0 ||
    evidence.dashboard_messages?.length > 0 ||
    evidence.checks_already_done?.length > 0;

  if (!hasContent) return <p className="text-sm text-white/40">No additional context provided.</p>;

  return (
    <div className="space-y-3 text-sm">
      {evidence.driver_reported_symptoms?.length > 0 && (
        <div>
          <p className="text-xs text-white/40 mb-1">Reported symptoms:</p>
          <div className="flex flex-wrap gap-1.5">
            {evidence.driver_reported_symptoms.map((s, i) => (
              <Badge key={i} variant="outline" className="border-white/20 text-white/60 text-xs">{s}</Badge>
            ))}
          </div>
        </div>
      )}
      {evidence.when_it_happens && (
        <p className="text-white/70"><span className="text-white/40">When:</span> {evidence.when_it_happens}</p>
      )}
      {evidence.recent_events?.length > 0 && (
        <p className="text-white/70"><span className="text-white/40">Recent events:</span> {evidence.recent_events.join(', ')}</p>
      )}
      {evidence.dashboard_messages?.length > 0 && (
        <p className="text-white/70"><span className="text-white/40">Dashboard:</span> {evidence.dashboard_messages.join(', ')}</p>
      )}
      {evidence.checks_already_done?.length > 0 && (
        <div>
          <p className="text-xs text-white/40 mb-1">Already checked:</p>
          <ul className="space-y-0.5">
            {evidence.checks_already_done.map((c, i) => (
              <li key={i} className="text-xs text-white/60">• {c}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* Legacy fallback for old-format reports */
function LegacySections({ report }) {
  return (
    <>
      {report.diagnosis_summary && !report.report_data?.conclusions && (
        <div>
          <h3 className="text-sm font-semibold text-white/60 mb-2">Summary</h3>
          <p className="text-white/90 leading-relaxed">{report.diagnosis_summary}</p>
        </div>
      )}
      {report.identified_issues?.length > 0 && !report.report_data?.hypotheses && (
        <div>
          <h3 className="text-sm font-semibold text-white/60 mb-3">Issues</h3>
          <div className="space-y-2">
            {report.identified_issues.map((issue, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
                <p className="text-white/90">{issue.issue}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {report.recommendations?.length > 0 && !report.report_data?.conclusions && (
        <div>
          <h3 className="text-sm font-semibold text-white/60 mb-3">Recommendations</h3>
          {report.recommendations.map((rec, i) => (
            <div key={i} className="flex items-start gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
              <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
              <p className="text-white/80">{rec}</p>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* ============ Export helpers ============ */

function buildTriageExport(report, rd) {
  const reportDate = report.created_date || report.created_at || Date.now();
  const lines = [];
  lines.push('INTAKE & TRIAGE REPORT (Roadside)');
  lines.push(`Generated: ${format(new Date(reportDate), 'MMMM d, yyyy h:mm a')}`);
  lines.push(`Disclaimer: ${rd.disclaimer || 'Not a definitive diagnosis.'}`);
  lines.push('');

  // Vehicle
  const vi = rd.vehicle_info;
  if (vi) {
    lines.push('VEHICLE INFORMATION');
    lines.push(`  ${[vi.year_reported, vi.make, vi.model].filter(Boolean).join(' ') || 'Not specified'}`);
    if (vi.engine) lines.push(`  Engine: ${vi.engine}`);
    if (vi.mileage_reported) lines.push(`  Mileage: ${vi.mileage_reported}`);
    lines.push(`  VIN: ${vi.vin || 'Not available'} (${vinStatusLabels[vi.vin_status] || vi.vin_status})`);
    lines.push('');
  }

  // Fault codes
  const fc = rd.fault_codes;
  if (fc) {
    lines.push('FAULT CODES');
    lines.push(`  Status: ${dtcStatusLabels[fc.dtc_status] || fc.dtc_status}`);
    (fc.active_codes || []).forEach(c => lines.push(`  [ACTIVE] ${c.raw_code}${c.notes ? ` — ${c.notes}` : ''}`));
    (fc.history_codes || []).forEach(c => lines.push(`  [HISTORY] ${c.raw_code}${c.notes ? ` — ${c.notes}` : ''}`));
    lines.push('');
  }

  // Evidence
  const ev = rd.evidence;
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
  if (rd.verified_facts?.length) {
    lines.push('VERIFIED FACTS');
    rd.verified_facts.forEach(f => lines.push(`  ✓ ${f}`));
    lines.push('');
  }

  // Conclusions
  if (rd.conclusions?.length) {
    lines.push('CONCLUSIONS');
    rd.conclusions.forEach((c, i) => {
      lines.push(`  ${i + 1}. [${c.type?.toUpperCase()}] ${c.statement}`);
      lines.push(`     Confidence: ${fmtConf(c.confidence)}`);
      lines.push(`     Action now: ${c.recommended_action_now}`);
      lines.push(`     Success if: ${c.success_criteria}`);
      lines.push(`     Fallback: ${c.fallback_if_not_confirmed}`);
      if (c.escalate_if?.length) lines.push(`     Escalate if: ${c.escalate_if.join('; ')}`);
    });
    lines.push('');
  }

  // Next checks
  if (rd.next_checks?.length) {
    lines.push('NEXT CHECKS');
    rd.next_checks.forEach(ck => {
      lines.push(`  Step ${ck.step}: ${ck.action}`);
      lines.push(`    Why: ${ck.why}`);
      lines.push(`    How: ${ck.how}`);
      lines.push(`    Expected: ${ck.expected_result}`);
      lines.push(`    If failed: ${ck.if_failed_next}`);
    });
    lines.push('');
  }

  // Severity
  if (rd.severity_triage) {
    lines.push('SEVERITY TRIAGE');
    lines.push(`  Urgency: ${rd.severity_triage.overall_urgency?.toUpperCase()}`);
    lines.push(`  Tow recommended: ${rd.severity_triage.tow_recommended ? 'YES' : 'No'}`);
    if (rd.severity_triage.do_not_drive_conditions?.length) {
      lines.push('  Do NOT drive if:');
      rd.severity_triage.do_not_drive_conditions.forEach(c => lines.push(`    - ${c}`));
    }
    lines.push('');
  }

  // Handoff
  if (rd.handoff_to_mechanic) {
    lines.push('HANDOFF TO MECHANIC');
    (rd.handoff_to_mechanic.what_to_tell_shop || []).forEach(w => lines.push(`  Tell: ${w}`));
    (rd.handoff_to_mechanic.questions_for_shop || []).forEach(q => lines.push(`  Ask: ${q}`));
    lines.push('');
  }

  // Limitations
  if (rd.limitations?.length) {
    lines.push('LIMITATIONS');
    rd.limitations.forEach(l => lines.push(`  - ${l}`));
  }

  return lines.join('\n');
}

function buildLegacyExport(report) {
  const reportDate = report.created_date || report.created_at || Date.now();
  return `
INTAKE & TRIAGE REPORT
Generated: ${format(new Date(reportDate), 'MMMM d, yyyy h:mm a')}

${report.truck_info?.make ? `VEHICLE: ${report.truck_info.year} ${report.truck_info.make} ${report.truck_info.model}` : ''}

SUMMARY
${report.diagnosis_summary || 'No summary available.'}

${report.recommendations?.length ? `RECOMMENDATIONS\n${report.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}` : ''}
  `.trim();
}

