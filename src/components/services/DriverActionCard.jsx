import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Eye,
  Wrench,
  OctagonAlert,
  ChevronDown,
  ChevronUp,
  Clock,
  AlertTriangle,
  CheckCircle,
  DollarSign,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DIFFICULTY_LEVELS } from '@/services/getHelpNowService';

const ACTION_TYPE_ICONS = {
  inspect: Eye,
  temporary_fix: Wrench,
  stop_and_call: OctagonAlert,
};

export default function DriverActionCard({ action, index = 0 }) {
  const [expanded, setExpanded] = useState(false);
  const diffConfig = DIFFICULTY_LEVELS[action.difficulty] || DIFFICULTY_LEVELS.driver_basic;
  const ActionIcon = ACTION_TYPE_ICONS[action.actionType] || Eye;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
    >
      <Card className="bg-white/5 border-white/10 hover:bg-white/8 transition-colors">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full p-4 text-left"
        >
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/10 shrink-0 mt-0.5">
              <ActionIcon className="w-4 h-4 text-white/80" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-semibold text-white">{action.title}</h4>
                <Badge variant="outline" className={`${diffConfig.color} text-[10px] border`}>
                  {diffConfig.label}
                </Badge>
              </div>
              <p className="text-xs text-white/60 mt-1 line-clamp-2">{action.description}</p>
              <div className="flex items-center gap-3 mt-2 text-[11px] text-white/40">
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
                {action.requiresTools && (
                  <span className="flex items-center gap-1">
                    <Wrench className="w-3 h-3" />
                    Tools needed
                  </span>
                )}
              </div>
            </div>
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
              <div className="px-4 pb-4 space-y-3">
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

                {/* Meta badges */}
                <div className="flex flex-wrap gap-1.5">
                  {action.roadsidePossible && (
                    <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20 text-[10px]">
                      <CheckCircle className="w-3 h-3 mr-1" /> Roadside OK
                    </Badge>
                  )}
                  {action.notSafeWithoutTraining && (
                    <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/20 text-[10px]">
                      <AlertTriangle className="w-3 h-3 mr-1" /> Training Required
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
