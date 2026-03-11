import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Wrench,
  OctagonAlert,
  PhoneCall,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  Ban,
  ChevronDown,
  ChevronUp,
  Clock,
  DollarSign,
  CheckCircle,
  Timer,
  HandMetal,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DIFFICULTY_CONFIG, SAFETY_CONFIG } from '@/utils/repairGuidanceRules';

/** Icon map for action categories */
const CATEGORY_ICONS = {
  inspect: Search,
  temporary_fix: Wrench,
  mitigation: Wrench,
  warning: OctagonAlert,
  escalate: PhoneCall,
};

/** Icon map for safety levels */
const SAFETY_ICONS = {
  'shield-check': ShieldCheck,
  'alert-triangle': AlertTriangle,
  'alert-circle': AlertCircle,
  'ban': Ban,
};

export default function GuidanceActionCard({ action, index = 0, compact = false }) {
  const [expanded, setExpanded] = useState(false);
  const diffConfig = DIFFICULTY_CONFIG[action.difficulty] || DIFFICULTY_CONFIG.driver_basic;
  const safetyConf = SAFETY_CONFIG[action.safetyLevel] || SAFETY_CONFIG.safe_if_stationary;
  const CategoryIcon = CATEGORY_ICONS[action.category] || Search;
  const SafetyIcon = SAFETY_ICONS[safetyConf.icon] || ShieldCheck;

  if (compact) {
    return (
      <div className="flex items-start gap-2 py-1.5">
        <CategoryIcon className="w-3.5 h-3.5 text-white/50 mt-0.5 shrink-0" />
        <div className="min-w-0">
          <p className="text-xs text-white/80 font-medium leading-tight">{action.title}</p>
          {action.estimatedMinutes && (
            <span className="text-[10px] text-white/40">~{action.estimatedMinutes} min</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
    >
      <Card className="bg-white/5 border-white/10 hover:bg-white/8 transition-colors">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full p-3 sm:p-4 text-left"
        >
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/10 shrink-0 mt-0.5">
              <CategoryIcon className="w-4 h-4 text-white/80" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-semibold text-white">{action.title}</h4>
                <Badge variant="outline" className={`${diffConfig.color} text-[10px] border`}>
                  {diffConfig.label}
                </Badge>
                {action.safetyLevel && action.safetyLevel !== 'safe_if_stationary' && (
                  <Badge variant="outline" className={`${safetyConf.color} text-[10px] border`}>
                    <SafetyIcon className="w-3 h-3 mr-0.5" />
                    {safetyConf.label}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-white/60 mt-1 line-clamp-2">{action.description}</p>

              {/* Meta row */}
              <div className="flex items-center gap-3 mt-2 text-[11px] text-white/40 flex-wrap">
                {action.estimatedMinutes && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    ~{action.estimatedMinutes} min
                  </span>
                )}
                {action.costSavingPotential && action.costSavingPotential !== 'low' && (
                  <span className="flex items-center gap-1 text-green-400/70">
                    <DollarSign className="w-3 h-3" />
                    {action.costSavingPotential === 'high' ? 'May save $$$' : 'May save $$'}
                  </span>
                )}
                {action.downtimeReductionPotential && action.downtimeReductionPotential !== 'low' && (
                  <span className="flex items-center gap-1 text-blue-400/70">
                    <Timer className="w-3 h-3" />
                    {action.downtimeReductionPotential === 'high' ? 'Reduce downtime' : 'May reduce downtime'}
                  </span>
                )}
                {action.requiresTools && (
                  <span className="flex items-center gap-1">
                    <Wrench className="w-3 h-3" />
                    Tools needed
                  </span>
                )}
              </div>
            </div>

            {/* Expand chevron */}
            <div className="shrink-0 text-white/40 pt-1">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </div>
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-3 sm:px-4 pb-4 space-y-3">
                {/* Steps */}
                {action.steps?.length > 0 && (
                  <div>
                    <h5 className="text-xs font-semibold text-white/70 mb-2">Steps:</h5>
                    <ol className="space-y-1.5">
                      {action.steps.map((step, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-white/60">
                          <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center shrink-0 text-[10px] text-white/50 font-medium mt-0.5">
                            {i + 1}
                          </span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Warnings */}
                {action.warnings?.length > 0 && (
                  <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                    <h5 className="text-xs font-semibold text-red-400 flex items-center gap-1.5 mb-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Safety Warnings
                    </h5>
                    <ul className="space-y-1">
                      {action.warnings.map((w, i) => (
                        <li key={i} className="text-xs text-red-300/80 flex items-start gap-1.5">
                          <span className="text-red-400 mt-0.5">•</span>
                          {w}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Success / Escalation signals */}
                {(action.successSignal || action.escalationTrigger || action.stopCondition) && (
                  <div className="space-y-1.5">
                    {action.successSignal && (
                      <p className="text-xs text-green-400/80 flex items-start gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <span><strong>Success:</strong> {action.successSignal}</span>
                      </p>
                    )}
                    {action.escalationTrigger && (
                      <p className="text-xs text-orange-400/80 flex items-start gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <span><strong>Escalate if:</strong> {action.escalationTrigger}</span>
                      </p>
                    )}
                    {action.stopCondition && (
                      <p className="text-xs text-blue-400/80 flex items-start gap-1.5">
                        <HandMetal className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <span><strong>Stop when:</strong> {action.stopCondition}</span>
                      </p>
                    )}
                  </div>
                )}

                {/* Meta badges */}
                <div className="flex flex-wrap gap-1.5">
                  {action.roadsidePossible && (
                    <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20 text-[10px]">
                      <CheckCircle className="w-3 h-3 mr-1" /> Roadside OK
                    </Badge>
                  )}
                  {action.safeIfStationary && (
                    <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20 text-[10px]">
                      <ShieldCheck className="w-3 h-3 mr-1" /> Safe if Parked
                    </Badge>
                  )}
                  {action.notSafeWithoutTraining && (
                    <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/20 text-[10px]">
                      <AlertTriangle className="w-3 h-3 mr-1" /> Training Required
                    </Badge>
                  )}
                  {action.requiresParts && (
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[10px]">
                      Parts Needed
                    </Badge>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}
