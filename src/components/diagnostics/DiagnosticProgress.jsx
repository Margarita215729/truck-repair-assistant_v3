import React from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, Search, Wrench } from 'lucide-react';

const stageInfo = {
  triage: { icon: AlertCircle, color: 'text-yellow-400', label: 'Initial Assessment' },
  system_focus: { icon: Search, color: 'text-blue-400', label: 'System Analysis' },
  root_cause: { icon: Wrench, color: 'text-orange-400', label: 'Root Cause' },
  solution: { icon: CheckCircle2, color: 'text-green-400', label: 'Solution' }
};

export default function DiagnosticProgress({ progress }) {
  if (!progress) return null;

  const stageConfig = stageInfo[progress.stage] || stageInfo.triage;
  const Icon = stageConfig.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-3 p-4 rounded-xl bg-gradient-to-r from-indigo-500/10 to-indigo-600/10 border border-indigo-500/30"
    >
      <div className="flex items-center gap-3 mb-3">
        <Icon className={`w-5 h-5 ${stageConfig.color}`} />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">{stageConfig.label}</span>
            {progress.stage_number && (
              <Badge variant="outline" className="border-indigo-500/30 text-indigo-400 text-xs">
                Step {progress.stage_number}/3
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {progress.stage_number && (
        <div className="w-full h-1.5 bg-white/10 rounded-full mb-3 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(progress.stage_number / 3) * 100}%` }}
            className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full"
          />
        </div>
      )}

      {/* Ruled Out */}
      {progress.ruled_out && progress.ruled_out.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-white/50 mb-1.5">✓ Ruled out:</p>
          <div className="flex flex-wrap gap-1.5">
            {progress.ruled_out.map((item, i) => (
              <Badge key={i} variant="outline" className="border-white/20 text-white/60 text-xs">
                {item}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Likely Causes */}
      {progress.likely_causes && progress.likely_causes.length > 0 && (
        <div>
          <p className="text-xs text-white/50 mb-1.5">Most likely causes:</p>
          <div className="space-y-1.5">
            {progress.likely_causes.map((cause, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  cause.probability === 'high' ? 'bg-red-400' :
                  cause.probability === 'medium' ? 'bg-yellow-400' :
                  'bg-blue-400'
                }`} />
                <span className="text-sm text-white/80">{cause.cause}</span>
                <Badge variant="outline" className={`ml-auto text-xs ${
                  cause.probability === 'high' ? 'border-red-500/30 text-red-400' :
                  cause.probability === 'medium' ? 'border-yellow-500/30 text-yellow-400' :
                  'border-blue-500/30 text-blue-400'
                }`}>
                  {cause.probability}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}