import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Truck, Mic, AlertCircle, AlertTriangle, X, Wrench, Camera } from 'lucide-react';
import { motion } from 'framer-motion';

export default function DiagnosticTools({ 
  truck, 
  errorCodes = [], 
  symptoms = [],
  onTruckClick,
  onAudioClick,
  onErrorCodesClick,
  onSymptomsClick,
  onToolkitClick,
  onPhotoClick,
  onClearTruck,
  onClearCodes,
  onClearSymptoms
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {/* Truck Selector */}
      <motion.div whileTap={{ scale: 0.98 }}>
        {truck ? (
          <Badge 
            className="bg-orange-500/20 text-orange-400 border border-orange-500/30 px-3 py-2 text-sm cursor-pointer hover:bg-orange-500/30 transition-colors flex items-center gap-2"
          >
            <Truck className="w-4 h-4" />
            {truck.year} {truck.make} {truck.model}
            <button onClick={onClearTruck} className="ml-1 hover:text-orange-200">
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ) : (
          <Button
            variant="outline"
            onClick={onTruckClick}
            className="border-white/20 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white"
          >
            <Truck className="w-4 h-4 mr-2" />
            Select Truck
          </Button>
        )}
      </motion.div>

      {/* Audio Recorder */}
      <motion.div whileTap={{ scale: 0.98 }}>
        <Button
          variant="outline"
          onClick={onAudioClick}
          className="border-white/20 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white"
        >
          <Mic className="w-4 h-4 mr-2" />
          Record Sound
        </Button>
      </motion.div>

      {/* Part Photo */}
      {onPhotoClick && (
        <motion.div whileTap={{ scale: 0.98 }}>
          <Button
            variant="outline"
            onClick={onPhotoClick}
            className="border-white/20 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white"
          >
            <Camera className="w-4 h-4 mr-2" />
            Photo ID
          </Button>
        </motion.div>
      )}

      {/* Toolkit Selector */}
      {onToolkitClick && (
        <motion.div whileTap={{ scale: 0.98 }}>
          <Button
            variant="outline"
            onClick={onToolkitClick}
            className="border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/10 text-orange-400 hover:text-orange-300"
          >
            <Wrench className="w-4 h-4 mr-2" />
            Load Toolkit
          </Button>
        </motion.div>
      )}

      {/* Error Codes */}
      <motion.div whileTap={{ scale: 0.98 }}>
        {errorCodes.length > 0 ? (
          <Badge 
            className="bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-2 text-sm cursor-pointer hover:bg-red-500/30 transition-colors flex items-center gap-2"
            onClick={onErrorCodesClick}
          >
            <AlertCircle className="w-4 h-4" />
            {errorCodes.length} code{errorCodes.length > 1 ? 's' : ''}
            <button onClick={(e) => { e.stopPropagation(); onClearCodes(); }} className="ml-1 hover:text-red-200">
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ) : (
          <Button
            variant="outline"
            onClick={onErrorCodesClick}
            className="border-white/20 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white"
          >
            <AlertCircle className="w-4 h-4 mr-2" />
            Error Codes
          </Button>
        )}
      </motion.div>

      {/* Symptoms */}
      <motion.div whileTap={{ scale: 0.98 }}>
        {symptoms.length > 0 ? (
          <Badge 
            className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-3 py-2 text-sm cursor-pointer hover:bg-yellow-500/30 transition-colors flex items-center gap-2"
            onClick={onSymptomsClick}
          >
            <AlertTriangle className="w-4 h-4" />
            {symptoms.length} symptom{symptoms.length > 1 ? 's' : ''}
            <button onClick={(e) => { e.stopPropagation(); onClearSymptoms(); }} className="ml-1 hover:text-yellow-200">
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ) : (
          <Button
            variant="outline"
            onClick={onSymptomsClick}
            className="border-white/20 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white"
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Symptoms
          </Button>
        )}
      </motion.div>
    </div>
  );
}