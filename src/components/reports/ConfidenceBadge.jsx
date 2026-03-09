import React from 'react';
import { Badge } from '@/components/ui/badge';

/**
 * Inline confidence badge.  Accepts 0-1 decimal or 0-100 integer.
 */

function normalize(val) {
  if (typeof val !== 'number') return null;
  return val > 1 ? Math.min(Math.round(val), 100) : Math.min(Math.round(val * 100), 100);
}

const levels = {
  high:    'bg-green-500/15 text-green-400 border-green-500/30',
  medium:  'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  low:     'bg-red-500/15 text-red-400 border-red-500/30',
  unknown: 'bg-white/5 text-white/40 border-white/10',
};

function getLevel(pct) {
  if (pct == null) return 'unknown';
  if (pct >= 70) return 'high';
  if (pct >= 40) return 'medium';
  return 'low';
}

export default function ConfidenceBadge({ value, className = '' }) {
  const pct = normalize(value);
  const level = getLevel(pct);
  return (
    <Badge variant="outline" className={`${levels[level]} border text-[10px] ${className}`}>
      {pct != null ? `${pct}% confidence` : 'Confidence unknown'}
    </Badge>
  );
}
