import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, User, Radio, HelpCircle, AlertTriangle } from 'lucide-react';

/**
 * Visual provenance label indicating the source/quality of data for a section.
 *
 * origin: 'verified' | 'user_reported' | 'telematics' | 'inferred' | 'missing'
 */

const cfg = {
  verified:      { icon: CheckCircle,   color: 'bg-green-500/15 text-green-400 border-green-500/30', label: 'Verified' },
  user_reported: { icon: User,          color: 'bg-blue-500/15 text-blue-400 border-blue-500/30',    label: 'User-reported' },
  telematics:    { icon: Radio,         color: 'bg-purple-500/15 text-purple-400 border-purple-500/30', label: 'Telematics' },
  inferred:      { icon: HelpCircle,    color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30', label: 'Inferred' },
  missing:       { icon: AlertTriangle, color: 'bg-white/5 text-white/40 border-white/10',           label: 'Missing' },
};

export default function ProvenanceBadge({ origin }) {
  const c = cfg[origin] || cfg.missing;
  const Icon = c.icon;
  return (
    <Badge variant="outline" className={`${c.color} border text-[10px] gap-1`}>
      <Icon className="w-3 h-3" />
      {c.label}
    </Badge>
  );
}
