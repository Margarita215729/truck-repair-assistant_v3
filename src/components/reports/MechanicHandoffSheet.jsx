import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  MessageSquare,
  HelpCircle,
  ArrowRight,
  FileDown,
  AlertCircle,
} from 'lucide-react';
import {
  getVehicleLabel,
  getVehicleInfo,
  getFaultCodes,
  getConclusions,
  getSeverityTriage,
  getMechanicHandoff,
} from '@/utils/reportAdapters';
import { exportMechanicHandoffPdf } from '@/utils/reportExport';

export default function MechanicHandoffSheet({ report }) {
  const handoff = getMechanicHandoff(report);
  const triage = getSeverityTriage(report);
  const codes = getFaultCodes(report);
  const conclusions = getConclusions(report);
  const v = getVehicleInfo(report);

  // Only render if there's meaningful handoff content
  if (!handoff && conclusions.length === 0 && codes.active_codes.length === 0) return null;

  return (
    <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white/80 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-orange-400" />
          Mechanic Handoff Sheet
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => exportMechanicHandoffPdf(report)}
          className="text-white/40 hover:text-white/80 text-xs"
        >
          <FileDown className="w-3.5 h-3.5 mr-1" />
          PDF
        </Button>
      </div>

      {/* Quick vehicle line */}
      <p className="text-xs text-white/50">
        {getVehicleLabel(report)}{v.vin ? ` — VIN: ${v.vin}` : ''}
      </p>

      {/* Triage */}
      {triage && (
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={triage.overall_urgency === 'high' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : triage.overall_urgency === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'}>
            {(triage.overall_urgency || '').toUpperCase()}
          </Badge>
          {triage.tow_recommended && (
            <Badge className="bg-red-500/20 text-red-400 border border-red-500/30 text-xs">TOW</Badge>
          )}
        </div>
      )}

      {/* Active codes */}
      {codes.active_codes.length > 0 && (
        <div>
          <p className="text-xs text-white/40 mb-1.5">Active fault codes:</p>
          <div className="flex flex-wrap gap-1.5">
            {codes.active_codes.map((c, i) => (
              <Badge key={i} className="bg-red-500/20 text-red-400 border border-red-500/30 text-xs">
                <AlertCircle className="w-3 h-3 mr-1" />
                {c.raw_code}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* What to tell shop */}
      {handoff?.what_to_tell_shop?.length > 0 && (
        <div>
          <p className="text-xs text-white/50 mb-1.5 font-medium">What to tell the shop:</p>
          <ul className="space-y-1">
            {handoff.what_to_tell_shop.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-white/80">
                <ArrowRight className="w-3 h-3 text-orange-400 shrink-0 mt-1" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Questions to ask */}
      {handoff?.questions_for_shop?.length > 0 && (
        <div>
          <p className="text-xs text-white/50 mb-1.5 font-medium">Questions to ask:</p>
          <ul className="space-y-1">
            {handoff.questions_for_shop.map((q, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-white/80">
                <HelpCircle className="w-3 h-3 text-blue-400 shrink-0 mt-1" />
                {q}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Top conclusion as quick "what we think" */}
      {!handoff && conclusions.length > 0 && (
        <div>
          <p className="text-xs text-white/50 mb-1.5 font-medium">Primary conclusion:</p>
          <p className="text-sm text-white/80">{conclusions[0].statement}</p>
          {conclusions[0].recommended_action_now && (
            <p className="text-xs text-orange-300/80 mt-1">
              Action: {conclusions[0].recommended_action_now}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
