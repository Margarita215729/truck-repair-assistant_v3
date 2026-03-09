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
  ChevronDown,
  Printer,
  Database
} from 'lucide-react';
import { format } from 'date-fns';

import {
  isNewFormatReport,
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
  getDisclaimer,
  getReportMetadata,
  getReportFormat,
} from '@/utils/reportAdapters';
import {
  exportReportTxt,
  exportReportPdf,
  exportReportDoc,
  exportReportHtml,
  exportMechanicHandoffPdf,
} from '@/utils/reportExport';

import ReportExecutiveSummary from './ReportExecutiveSummary';
import ProvenanceBadge from './ProvenanceBadge';
import ConfidenceBadge from './ConfidenceBadge';
import EvidenceSourcesPanel from './EvidenceSourcesPanel';
import MechanicHandoffSheet from './MechanicHandoffSheet';

const urgencyConfig = {
  high: { icon: AlertCircle, color: 'text-red-500 bg-red-500/20 border-red-500/30', label: 'HIGH' },
  medium: { icon: AlertTriangle, color: 'text-yellow-500 bg-yellow-500/20 border-yellow-500/30', label: 'MEDIUM' },
  low: { icon: Clock, color: 'text-blue-500 bg-blue-500/20 border-blue-500/30', label: 'LOW' }
};

const dtcStatusLabels = {
  active_present: 'Active fault codes present',
  active_reported: 'Active fault codes reported',
  history_only: 'History/inactive codes only',
  none_reported: 'No active fault codes reported',
  unavailable: 'Fault code data unavailable',
  unknown: 'Fault code status unknown',
};

const vinStatusLabels = {
  provided: 'VIN provided',
  invalid: 'VIN invalid (check format)',
  unavailable: 'VIN not available',
  unknown: 'VIN status unknown',
};

export default function ReportDetail({ report, open, onClose }) {
  const [showExportMenu, setShowExportMenu] = useState(false);
  if (!report) return null;

  const fmt = getReportFormat(report);
  const vehicle = getVehicleInfo(report);
  const faultCodes = getFaultCodes(report);
  const triage = getSeverityTriage(report);
  const verifiedFacts = getVerifiedFacts(report);
  const hypotheses = getHypotheses(report);
  const conclusions = getConclusions(report);
  const nextChecks = getNextChecks(report);
  const evidence = getEvidence(report);
  const handoff = getMechanicHandoff(report);
  const limitations = getLimitations(report);
  const disclaimer = getDisclaimer(report);
  const metadata = getReportMetadata(report);

  const reportDate = report.created_date || report.created_at || Date.now();
  const fileDate = format(new Date(reportDate), 'yyyy-MM-dd');

  const handleExportTxt = () => { exportReportTxt(report); setShowExportMenu(false); };
  const handleExportPdf = () => { exportReportPdf(report); setShowExportMenu(false); };
  const handleExportDocx = () => { exportReportDoc(report); setShowExportMenu(false); };
  const handleExportHtml = () => { exportReportHtml(report); setShowExportMenu(false); };

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
                  {fmt !== 'unknown' && (
                    <Badge variant="outline" className={`ml-2 text-[10px] ${fmt === 'new' ? 'border-green-500/40 text-green-400' : 'border-white/20 text-white/40'}`}>
                      {fmt === 'new' ? 'New format' : 'Legacy'}
                    </Badge>
                  )}
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
                <div className="absolute right-0 top-full mt-1 z-50 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-xl py-1 min-w-[160px]">
                  <button onClick={handleExportPdf} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/80 hover:bg-white/10 transition-colors">
                    <FileDown className="w-4 h-4 text-red-400" /> PDF
                  </button>
                  <button onClick={handleExportDocx} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/80 hover:bg-white/10 transition-colors">
                    <FileDown className="w-4 h-4 text-blue-400" /> Word (.doc)
                  </button>
                  <button onClick={handleExportHtml} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/80 hover:bg-white/10 transition-colors">
                    <Printer className="w-4 h-4 text-green-400" /> Print (HTML)
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
            {disclaimer}
          </div>

          {/* Executive Summary (new component) */}
          <ReportExecutiveSummary report={report} />

          {/* Severity Triage Banner */}
          {triage.overall_urgency && triage.overall_urgency !== 'unknown' && (
            <SeverityBanner triage={triage} />
          )}

          {/* 1. Vehicle Info */}
          <Section icon={Truck} title="Vehicle Information">
            <VehicleInfoBlock vehicle={vehicle} />
          </Section>

          {/* 2. Fault Codes */}
          <Section icon={AlertCircle} title="Fault Codes">
            <FaultCodesBlock faultCodes={faultCodes} />
          </Section>

          {/* 3. Evidence & Context */}
          <Section icon={Info} title="Evidence & Context">
            <EvidenceBlock evidence={evidence} />
            <EvidenceSourcesPanel report={report} />
          </Section>

          {/* 4. Verified Facts */}
          {verifiedFacts.length > 0 && (
            <Section icon={CheckCircle} title="Verified Facts">
              <ul className="space-y-1.5">
                {verifiedFacts.map((fact, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-white/80">
                    <CheckCircle className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                    <span>{typeof fact === 'string' ? fact : fact.statement || JSON.stringify(fact)}</span>
                    {fact.origin && <ProvenanceBadge origin={fact.origin} />}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* 5. Conclusions (HIGHLIGHTED) */}
          {conclusions.length > 0 && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-orange-500/10 to-orange-600/10 border border-orange-500/30">
              <h3 className="text-sm font-bold text-orange-400 mb-3 flex items-center gap-2">
                <ArrowRight className="w-4 h-4" />
                CONCLUSIONS — What To Do
              </h3>
              <div className="space-y-4">
                {conclusions.map((c, i) => (
                  <div key={i} className="p-3 bg-black/30 rounded-lg border border-white/10">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={c.type === 'primary' ? 'bg-orange-500/30 text-orange-300 border-orange-500/40' : 'bg-white/10 text-white/60 border-white/20'}>
                        {c.type === 'primary' ? 'PRIMARY' : 'SECONDARY'}
                      </Badge>
                      <ConfidenceBadge value={c.confidence} />
                    </div>
                    <p className="text-white font-medium mb-2">{c.statement}</p>
                    <div className="space-y-1 text-xs text-white/60">
                      {c.recommended_action_now && <p><span className="text-orange-400/80">Action now:</span> {c.recommended_action_now}</p>}
                      {c.success_criteria && <p><span className="text-green-400/80">Success if:</span> {c.success_criteria}</p>}
                      {c.fallback_if_not_confirmed && <p><span className="text-yellow-400/80">Fallback:</span> {c.fallback_if_not_confirmed}</p>}
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
          {hypotheses.length > 0 && (
            <Section icon={HelpCircle} title="Hypotheses">
              <div className="space-y-2">
                {hypotheses.map((h, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
                    <div className="text-lg font-bold text-white/30 w-6 text-center">{i + 1}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-white/90 font-medium">{h.possible_cause}</p>
                        <ConfidenceBadge value={h.confidence} />
                      </div>
                      <p className="text-xs text-white/50">{h.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* 6. Next Checks */}
          {nextChecks.length > 0 && (
            <Section icon={CheckCircle} title="Next Checks (cheapest / fastest first)">
              <div className="space-y-3">
                {nextChecks.map((check, i) => (
                  <div key={i} className="p-3 bg-white/5 rounded-lg border border-white/10">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-xs font-bold">
                        {check.step || i + 1}
                      </div>
                      <p className="text-white font-medium text-sm">{check.action}</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs text-white/60 pl-8">
                      {check.why && <p><span className="text-white/40">Why:</span> {check.why}</p>}
                      {check.how && <p><span className="text-white/40">How:</span> {check.how}</p>}
                      {check.expected_result && <p><span className="text-white/40">Expected:</span> {check.expected_result}</p>}
                      {check.if_failed_next && <p><span className="text-white/40">If failed:</span> {check.if_failed_next}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* 7. Severity & Tow detail */}
          {triage.overall_urgency && triage.overall_urgency !== 'unknown' && (
            <Section icon={AlertTriangle} title="Severity & Tow Recommendation">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-white/60">Urgency:</span>
                  {(() => {
                    const cfg = urgencyConfig[triage.overall_urgency] || urgencyConfig.medium;
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
                  <Badge className={triage.tow_recommended
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : 'bg-green-500/20 text-green-400 border border-green-500/30'
                  }>
                    {triage.tow_recommended ? 'YES — Tow recommended' : 'No — May not need tow'}
                  </Badge>
                </div>
                {triage.can_drive === false && (
                  <Badge className="bg-red-500/20 text-red-400 border border-red-500/30">
                    Do NOT drive
                  </Badge>
                )}
                {triage.do_not_drive_conditions?.length > 0 && (
                  <div>
                    <p className="text-xs text-red-400 font-medium mb-1">Do NOT drive if:</p>
                    <ul className="space-y-1">
                      {triage.do_not_drive_conditions.map((cond, i) => (
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

          {/* 8. Handoff to Mechanic (new component) */}
          <MechanicHandoffSheet report={report} />

          {/* 9. Limitations */}
          {limitations.length > 0 && (
            <Section icon={Info} title="Limitations">
              <ul className="space-y-1">
                {limitations.map((lim, i) => (
                  <li key={i} className="text-xs text-white/50 flex items-start gap-2">
                    <span className="text-white/30">•</span>
                    {lim}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* 10. Report Metadata */}
          {metadata.schema_version && (
            <Section icon={Database} title="Report Metadata">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-white/50">
                {metadata.schema_version && <Detail label="Schema" value={`v${metadata.schema_version}`} />}
                {metadata.normalization_version && <Detail label="Normalization" value={`v${metadata.normalization_version}`} />}
                {metadata.model_version && <Detail label="Model" value={metadata.model_version} />}
                {metadata.generation_timestamp && <Detail label="Generated" value={format(new Date(metadata.generation_timestamp), 'MMM d, yyyy h:mm a')} />}
              </div>
            </Section>
          )}

          {/* LEGACY — old-format issues/recommendations if not covered above */}
          {fmt === 'legacy' && <LegacySections report={report} />}
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

function VehicleInfoBlock({ vehicle }) {
  if (!vehicle.make && !vehicle.model && !vehicle.vin) {
    return <p className="text-sm text-white/40">No vehicle information provided.</p>;
  }
  const vi = vehicle;
  return (
    <div className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-2">
      <p className="text-lg font-semibold text-white">
        {[vi.year, vi.make, vi.model].filter(Boolean).join(' ') || 'Vehicle not specified'}
      </p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        {vi.engine && <Detail label="Engine" value={vi.engine} />}
        {vi.transmission && <Detail label="Transmission" value={vi.transmission} />}
        {vi.mileage && <Detail label="Mileage" value={vi.mileage} />}
        <Detail 
          label="VIN" 
          value={vi.vin || '—'} 
          badge={vi.vin_status ? vinStatusLabels[vi.vin_status] : null}
          badgeColor={vi.vin_status === 'provided' ? 'bg-green-500/20 text-green-400 border-green-500/30' : vi.vin_status === 'invalid' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-white/10 text-white/50 border-white/20'}
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

function FaultCodesBlock({ faultCodes }) {
  const { dtc_status, active_codes, history_codes, notes } = faultCodes;

  if (dtc_status === 'unknown' && !active_codes.length && !history_codes.length) {
    return <p className="text-sm text-white/50">No fault code data in this report.</p>;
  }

  return (
    <div className="space-y-3">
      <Badge variant="outline" className={`text-xs ${
        dtc_status === 'active_present' || dtc_status === 'active_reported' ? 'border-red-500/40 text-red-400' :
        dtc_status === 'none_reported' ? 'border-green-500/40 text-green-400' :
        'border-white/20 text-white/60'
      }`}>
        {dtcStatusLabels[dtc_status] || dtc_status}
      </Badge>

      {active_codes.length > 0 && (
        <div className="space-y-2">
          {active_codes.map((c, i) => (
            <div key={i} className="p-3 bg-red-500/5 rounded-lg border border-red-500/20">
              <div className="flex items-center gap-2">
                <Badge className="bg-red-500/20 text-red-400 border border-red-500/30">{c.raw_code}</Badge>
                {c.system && <span className="text-xs text-white/40">{c.system}</span>}
                {c.module && <span className="text-xs text-white/40">({c.module})</span>}
                {c.origin && <ProvenanceBadge origin={c.origin} />}
              </div>
              {c.notes && <p className="text-xs text-white/60 mt-1">{c.notes}</p>}
            </div>
          ))}
        </div>
      )}

      {history_codes.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-white/40 font-medium">History/inactive codes:</p>
          {history_codes.map((c, i) => (
            <div key={i} className="p-2 bg-yellow-500/5 rounded-lg border border-yellow-500/20">
              <Badge className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-xs">{c.raw_code}</Badge>
              {c.notes && <span className="text-xs text-white/50 ml-2">{c.notes}</span>}
            </div>
          ))}
        </div>
      )}

      {notes && <p className="text-xs text-white/50 italic">{notes}</p>}
    </div>
  );
}

function EvidenceBlock({ evidence }) {
  if (!evidence) return <p className="text-sm text-white/40">No additional context provided.</p>;

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
  const rd = report.report_data || {};
  return (
    <>
      {report.diagnosis_summary && !rd.conclusions && (
        <div>
          <h3 className="text-sm font-semibold text-white/60 mb-2">Summary</h3>
          <p className="text-white/90 leading-relaxed">{report.diagnosis_summary}</p>
        </div>
      )}
      {report.identified_issues?.length > 0 && !rd.hypotheses && (
        <div>
          <h3 className="text-sm font-semibold text-white/60 mb-3">Issues</h3>
          <div className="space-y-2">
            {report.identified_issues.map((issue, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
                <p className="text-white/90">{issue.issue || issue}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {report.recommendations?.length > 0 && !rd.conclusions && (
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

