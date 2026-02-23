import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Truck, Mic, AlertCircle, AlertTriangle, X } from 'lucide-react';
import { motion } from 'framer-motion';

export default function DiagnosticTools({ 
  truck, 
  errorCodes = [], 
  symptoms = [],
  onTruckClick,
  onAudioClick,
  onErrorCodesClick,
  onSymptomsClick,
  onClearTruck,
  onClearCodes,
  onClearSymptoms
}) {
  const ToolButton = ({ icon: Icon, label, count, active, color = 'white', onClick, onClear }) => {
    if (active) {
      const colorMap = {
        orange: 'bg-orange-500/15 text-orange-400 border-orange-500/30 hover:bg-orange-500/25',
        red: 'bg-red-500/15 text-red-400 border-red-500/30 hover:bg-red-500/25',
        yellow: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/25',
      };
      return (
        <motion.div whileTap={{ scale: 0.95 }} className="shrink-0">
          <div
            className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl border text-xs font-medium cursor-pointer transition-colors ${colorMap[color]}`}
            onClick={onClick}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="max-w-[80px] truncate">{label}</span>
            {count && <span className="text-[10px] opacity-70">{count}</span>}
            {onClear && (
              <button onClick={(e) => { e.stopPropagation(); onClear(); }} className="ml-0.5 p-0.5 rounded hover:bg-white/10">
                <X className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        </motion.div>
      );
    }
    return (
      <motion.div whileTap={{ scale: 0.95 }} className="shrink-0">
        <button
          onClick={onClick}
          className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/90 text-xs transition-colors"
        >
          <Icon className="w-3.5 h-3.5" />
          <span>{label}</span>
        </button>
      </motion.div>
    );
  };

  return (
    <div className="flex flex-nowrap gap-1.5 overflow-x-auto scrollbar-hide py-0.5">
      <ToolButton
        icon={Truck}
        label={truck ? `${truck.make} ${truck.model}`.substring(0, 16) : 'Truck'}
        active={!!truck}
        color="orange"
        onClick={onTruckClick}
        onClear={truck ? onClearTruck : undefined}
      />
      <ToolButton
        icon={Mic}
        label="Sound"
        onClick={onAudioClick}
      />
      <ToolButton
        icon={AlertCircle}
        label={errorCodes.length > 0 ? `${errorCodes.length} code${errorCodes.length > 1 ? 's' : ''}` : 'Codes'}
        active={errorCodes.length > 0}
        color="red"
        onClick={onErrorCodesClick}
        onClear={errorCodes.length > 0 ? onClearCodes : undefined}
      />
      <ToolButton
        icon={AlertTriangle}
        label={symptoms.length > 0 ? `${symptoms.length} symptom${symptoms.length > 1 ? 's' : ''}` : 'Symptoms'}
        active={symptoms.length > 0}
        color="yellow"
        onClick={onSymptomsClick}
        onClear={symptoms.length > 0 ? onClearSymptoms : undefined}
      />
    </div>
  );
}