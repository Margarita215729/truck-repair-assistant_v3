import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  Wrench,
  PhoneCall,
  OctagonAlert,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * GuidanceSummaryBlock — compact at-a-glance guidance summary.
 *
 * Shows:
 *  - Can you drive?
 *  - Inspect first?
 *  - Temporary actions available?
 *  - Escalate now?
 *  - Top recommended action
 *
 * Props:
 *  - summary: from buildSummary()
 *  - onExpand: callback to show full GuidanceSection
 *  - className: string
 */
export default function GuidanceSummaryBlock({ summary, onExpand, className = '' }) {
  if (!summary) return null;

  const { canDrive, inspectFirst, temporaryActionCount, escalateNow, topAction, driveability, urgency } = summary;

  const urgencyColor = {
    critical: 'text-red-400',
    high: 'text-orange-400',
    medium: 'text-yellow-400',
    low: 'text-green-400',
    unknown: 'text-white/50',
  }[urgency] || 'text-white/50';

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className={`bg-white/5 border-white/10 p-3 sm:p-4 ${className}`}>
        {/* Quick status row */}
        <div className="flex flex-wrap gap-2 mb-3">
          {/* Can drive? */}
          {canDrive ? (
            <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20 text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5 mr-1" />
              May be driveable
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/20 text-[11px]">
              <ShieldAlert className="w-3.5 h-3.5 mr-1" />
              Stop — do not drive
            </Badge>
          )}

          {/* Urgency */}
          <Badge variant="outline" className={`bg-white/5 ${urgencyColor} border-white/10 text-[11px]`}>
            {urgency === 'critical' ? 'Critical' : urgency === 'high' ? 'High urgency' : urgency === 'medium' ? 'Medium urgency' : 'Low urgency'}
          </Badge>

          {/* Inspect first */}
          {inspectFirst && (
            <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[11px]">
              <Search className="w-3.5 h-3.5 mr-1" />
              Check first
            </Badge>
          )}

          {/* Temporary actions */}
          {temporaryActionCount > 0 && (
            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20 text-[11px]">
              <Wrench className="w-3.5 h-3.5 mr-1" />
              {temporaryActionCount} temp fix{temporaryActionCount > 1 ? 'es' : ''}
            </Badge>
          )}

          {/* Escalate */}
          {escalateNow && (
            <Badge variant="outline" className="bg-orange-500/10 text-orange-400 border-orange-500/20 text-[11px]">
              <PhoneCall className="w-3.5 h-3.5 mr-1" />
              May need service
            </Badge>
          )}
        </div>

        {/* Top action one-liner */}
        {topAction && (
          <div className="flex items-start gap-2">
            {topAction.category === 'warning' ? (
              <OctagonAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            ) : topAction.category === 'escalate' ? (
              <PhoneCall className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
            )}
            <div className="min-w-0">
              <p className="text-xs text-white/80 font-medium">{topAction.title}</p>
              <p className="text-[11px] text-white/50 line-clamp-1 mt-0.5">{topAction.description}</p>
            </div>
          </div>
        )}

        {/* Expand CTA */}
        {onExpand && (
          <button
            onClick={onExpand}
            className="mt-3 text-[11px] text-orange-400 hover:text-orange-300 transition-colors font-medium"
          >
            View full repair guidance →
          </button>
        )}
      </Card>
    </motion.div>
  );
}
