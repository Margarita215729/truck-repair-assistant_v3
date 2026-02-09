import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { 
  Wrench, 
  Clock, 
  AlertTriangle, 
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Settings
} from 'lucide-react';

const difficultyColors = {
  easy: 'bg-green-500/20 text-green-400 border-green-500/30',
  moderate: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  difficult: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  professional: 'bg-red-500/20 text-red-400 border-red-500/30'
};

export default function RepairInstructions({ instructions }) {
  const [expandedProcedures, setExpandedProcedures] = useState({});

  if (!instructions || instructions.length === 0) return null;

  const toggleProcedure = (index) => {
    setExpandedProcedures(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 space-y-3"
    >
      {instructions.map((procedure, idx) => (
        <div
          key={idx}
          className="rounded-xl bg-gradient-to-r from-blue-500/10 to-blue-600/10 border border-blue-500/30 overflow-hidden"
        >
          {/* Header */}
          <button
            onClick={() => toggleProcedure(idx)}
            className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Wrench className="w-5 h-5 text-blue-400" />
              <div className="text-left">
                <h3 className="font-semibold text-white">{procedure.procedure_name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  {procedure.difficulty && (
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${difficultyColors[procedure.difficulty]}`}
                    >
                      {procedure.difficulty}
                    </Badge>
                  )}
                  {procedure.estimated_time && (
                    <span className="text-xs text-white/60 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {procedure.estimated_time}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {expandedProcedures[idx] ? (
              <ChevronUp className="w-5 h-5 text-white/40" />
            ) : (
              <ChevronDown className="w-5 h-5 text-white/40" />
            )}
          </button>

          {/* Expanded Content */}
          <AnimatePresence>
            {expandedProcedures[idx] && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="px-4 pb-4 space-y-4">
                  {/* Tools Required */}
                  {procedure.tools_required && procedure.tools_required.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Settings className="w-4 h-4 text-blue-400" />
                        <span className="text-sm font-semibold text-white/90">Tools Required</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {procedure.tools_required.map((tool, i) => (
                          <Badge key={i} variant="outline" className="border-white/20 text-white/70">
                            {tool}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Safety Warnings */}
                  {procedure.safety_warnings && procedure.safety_warnings.length > 0 && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                        <span className="text-sm font-semibold text-red-400">Safety Warnings</span>
                      </div>
                      <ul className="space-y-1">
                        {procedure.safety_warnings.map((warning, i) => (
                          <li key={i} className="text-sm text-white/80 flex items-start gap-2">
                            <span className="text-red-400 mt-0.5">•</span>
                            {warning}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Steps */}
                  {procedure.steps && procedure.steps.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle2 className="w-4 h-4 text-blue-400" />
                        <span className="text-sm font-semibold text-white/90">Step-by-Step Instructions</span>
                      </div>
                      <div className="space-y-3">
                        {procedure.steps.map((step, i) => (
                          <div key={i} className="flex gap-3">
                            <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-xs font-bold text-blue-400">{i + 1}</span>
                            </div>
                            <p className="text-sm text-white/80 flex-1">{step}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </motion.div>
  );
}