import React from 'react';
import { Button } from '@/components/ui/button';
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
  return (
    <div className="flex flex-nowrap gap-1.5 md:gap-2 overflow-x-auto scrollbar-hide">
      {/* Truck Selector */}
      <motion.div whileTap={{ scale: 0.98 }} className="shrink-0">
        {truck ? (
          <Badge 
            className="bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm cursor-pointer hover:bg-orange-500/30 transition-colors flex items-center gap-1.5"
          >
            <Truck className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span className="hidden md:inline">{truck.year} {truck.make} {truck.model}</span>
            <span className="md:hidden">{truck.make}</span>
            <button onClick={onClearTruck} className="ml-0.5 hover:text-orange-200">
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={onTruckClick}
            className="border-white/20 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white h-8 px-2 md:px-3"
            title="Select Truck"
          >
            <Truck className="w-4 h-4 md:mr-1.5" />
            <span className="hidden md:inline text-xs">Truck</span>
          </Button>
        )}
      </motion.div>

      {/* Audio Recorder */}
      <motion.div whileTap={{ scale: 0.98 }} className="shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={onAudioClick}
          className="border-white/20 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white h-8 px-2 md:px-3"
          title="Record Sound"
        >
          <Mic className="w-4 h-4 md:mr-1.5" />
          <span className="hidden md:inline text-xs">Sound</span>
        </Button>
      </motion.div>

      {/* Error Codes */}
      <motion.div whileTap={{ scale: 0.98 }} className="shrink-0">
        {errorCodes.length > 0 ? (
          <Badge 
            className="bg-red-500/20 text-red-400 border border-red-500/30 px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm cursor-pointer hover:bg-red-500/30 transition-colors flex items-center gap-1.5"
            onClick={onErrorCodesClick}
          >
            <AlertCircle className="w-3.5 h-3.5 md:w-4 md:h-4" />
            {errorCodes.length} <span className="hidden md:inline">code{errorCodes.length > 1 ? 's' : ''}</span>
            <button onClick={(e) => { e.stopPropagation(); onClearCodes(); }} className="ml-0.5 hover:text-red-200">
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={onErrorCodesClick}
            className="border-white/20 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white h-8 px-2 md:px-3"
            title="Error Codes"
          >
            <AlertCircle className="w-4 h-4 md:mr-1.5" />
            <span className="hidden md:inline text-xs">Codes</span>
          </Button>
        )}
      </motion.div>

      {/* Symptoms */}
      <motion.div whileTap={{ scale: 0.98 }} className="shrink-0">
        {symptoms.length > 0 ? (
          <Badge 
            className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm cursor-pointer hover:bg-yellow-500/30 transition-colors flex items-center gap-1.5"
            onClick={onSymptomsClick}
          >
            <AlertTriangle className="w-3.5 h-3.5 md:w-4 md:h-4" />
            {symptoms.length} <span className="hidden md:inline">symptom{symptoms.length > 1 ? 's' : ''}</span>
            <button onClick={(e) => { e.stopPropagation(); onClearSymptoms(); }} className="ml-0.5 hover:text-yellow-200">
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={onSymptomsClick}
            className="border-white/20 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white h-8 px-2 md:px-3"
            title="Symptoms"
          >
            <AlertTriangle className="w-4 h-4 md:mr-1.5" />
            <span className="hidden md:inline text-xs">Symptoms</span>
          </Button>
        )}
      </motion.div>
    </div>
  );
}