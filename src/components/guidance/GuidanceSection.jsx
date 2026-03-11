import React, { useState } from 'react';
import {
  Search,
  Wrench,
  OctagonAlert,
  PhoneCall,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import GuidanceActionCard from './GuidanceActionCard';

const BUCKET_ICONS = {
  inspect: Search,
  temporary_fix: Wrench,
  mitigation: Wrench,
  warning: OctagonAlert,
  escalate: PhoneCall,
};

/**
 * GuidanceSection renders the full 4-bucket guidance view.
 *
 * Props:
 *  - buckets: GuidanceBucket[] from groupIntoBuckets()
 *  - compact: boolean (true = compact inline; false = full expanded)
 *  - maxActionsPerBucket: number (default 10; for inline previews use 3)
 *  - title: string (optional override)
 *  - className: string
 */
export default function GuidanceSection({
  buckets = [],
  compact = false,
  maxActionsPerBucket = 10,
  title,
  className = '',
}) {
  if (!buckets || buckets.length === 0) return null;

  return (
    <div className={`space-y-3 ${className}`}>
      {title && (
        <h3 className="text-sm font-semibold text-white/80">{title}</h3>
      )}
      {buckets.map((bucket) => (
        <BucketGroup
          key={bucket.key}
          bucket={bucket}
          compact={compact}
          maxActions={maxActionsPerBucket}
        />
      ))}
    </div>
  );
}

function BucketGroup({ bucket, compact, maxActions }) {
  const [collapsed, setCollapsed] = useState(compact);
  const BucketIcon = BUCKET_ICONS[bucket.key] || Search;
  const displayActions = bucket.actions.slice(0, maxActions);
  const hasMore = bucket.actions.length > maxActions;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`rounded-lg border ${bucket.color} overflow-hidden`}
    >
      {/* Bucket header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left"
      >
        <BucketIcon className={`w-4 h-4 ${bucket.headerColor}`} />
        <span className={`text-xs font-semibold ${bucket.headerColor}`}>
          {bucket.title}
        </span>
        <span className="text-[10px] text-white/40 ml-1">
          ({bucket.actions.length})
        </span>
        <div className="ml-auto text-white/40">
          {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </div>
      </button>

      {/* Actions */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-2 pb-2 space-y-1.5">
              {displayActions.map((action, i) => (
                <GuidanceActionCard
                  key={action.id}
                  action={action}
                  index={i}
                  compact={compact}
                />
              ))}
              {hasMore && (
                <p className="text-[10px] text-white/30 text-center py-1">
                  +{bucket.actions.length - maxActions} more
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
