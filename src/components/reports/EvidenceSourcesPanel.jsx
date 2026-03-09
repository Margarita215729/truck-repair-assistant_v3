import React from 'react';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle,
  Mic,
  Camera,
  MessageSquare,
  Radio,
  FileText,
  Wrench,
  Clock,
} from 'lucide-react';
import { getEvidenceSources } from '@/utils/reportAdapters';

const iconMap = {
  fault_codes: AlertCircle,
  symptoms: MessageSquare,
  when: Clock,
  events: FileText,
  dashboard: AlertCircle,
  checks: Wrench,
  photo: Camera,
  audio: Mic,
  telematics: Radio,
};

export default function EvidenceSourcesPanel({ report }) {
  const sources = getEvidenceSources(report);
  if (sources.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs text-white/40 font-medium uppercase tracking-wide">Evidence Sources</p>
      <div className="flex flex-wrap gap-1.5">
        {sources.map((s, i) => {
          const Icon = iconMap[s.type] || FileText;
          return (
            <Badge
              key={i}
              variant="outline"
              className="border-white/15 text-white/60 text-[10px] gap-1"
            >
              <Icon className="w-3 h-3" />
              {s.label}
            </Badge>
          );
        })}
      </div>
    </div>
  );
}
