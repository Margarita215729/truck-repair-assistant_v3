import React from 'react';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle,
  AlertTriangle,
  Clock,
  Truck as TruckIcon,
  ArrowRight,
} from 'lucide-react';
import ConfidenceBadge from './ConfidenceBadge';
import { getExecutiveSummary } from '@/utils/reportAdapters';

const urgencyCfg = {
  high:   { icon: AlertCircle,   bg: 'bg-red-500/15',    border: 'border-red-500/30',    text: 'text-red-400',    label: 'STOP — Do not drive' },
  medium: { icon: AlertTriangle,  bg: 'bg-yellow-500/15', border: 'border-yellow-500/30', text: 'text-yellow-400', label: 'CAUTION — Limit driving' },
  low:    { icon: Clock,          bg: 'bg-blue-500/15',   border: 'border-blue-500/30',   text: 'text-blue-400',   label: 'OK — Schedule service soon' },
};

export default function ReportExecutiveSummary({ report }) {
  const exec = getExecutiveSummary(report);
  if (!exec.urgency && !exec.action_now) return null;

  const cfg = urgencyCfg[exec.urgency] || urgencyCfg.medium;
  const Icon = cfg.icon;

  return (
    <div className={`p-4 rounded-xl ${cfg.bg} border ${cfg.border} space-y-3`}>
      {/* Row 1: urgency + tow + drive */}
      <div className="flex items-center flex-wrap gap-2">
        <Badge className={`${cfg.bg} ${cfg.text} border ${cfg.border} font-bold`}>
          <Icon className="w-3.5 h-3.5 mr-1" />
          {cfg.label}
        </Badge>
        {exec.tow_recommended && (
          <Badge className="bg-red-500/20 text-red-400 border border-red-500/30 text-xs">TOW</Badge>
        )}
        {exec.can_drive === true && (
          <Badge className="bg-green-500/20 text-green-400 border border-green-500/30 text-xs">CAN DRIVE</Badge>
        )}
      </div>

      {/* Row 2: summary + action */}
      <p className="text-white/90 text-sm font-medium leading-snug">{exec.summary}</p>

      {exec.action_now && (
        <div className="flex items-start gap-2 text-sm text-orange-300/90">
          <ArrowRight className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{exec.action_now}</span>
        </div>
      )}

      {/* Row 3: subsystem + confidence */}
      <div className="flex items-center gap-3 flex-wrap">
        {exec.primary_subsystem && (
          <Badge variant="outline" className="border-white/20 text-white/50 text-[10px]">
            <TruckIcon className="w-3 h-3 mr-1" />
            {exec.primary_subsystem}
          </Badge>
        )}
        {exec.confidence != null && <ConfidenceBadge value={exec.confidence} />}
      </div>
    </div>
  );
}
