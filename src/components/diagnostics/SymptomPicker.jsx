import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

const SYMPTOM_CATEGORIES = {
  'Engine Issues': [
    'Engine won\'t start',
    'Engine stalls frequently',
    'Rough idle',
    'Loss of power',
    'Engine overheating',
    'Excessive smoke (black)',
    'Excessive smoke (white)',
    'Excessive smoke (blue)',
    'Knocking/pinging sound',
    'Engine misfiring',
  ],
  'Electrical': [
    'Battery drains quickly',
    'Warning lights on dash',
    'Alternator issues',
    'Starter problems',
    'Electrical shorts',
    'Lights flickering',
  ],
  'Transmission': [
    'Hard shifting',
    'Slipping gears',
    'Grinding noise when shifting',
    'Won\'t go into gear',
    'Transmission overheating',
    'Clutch problems',
  ],
  'Brakes': [
    'Squealing brakes',
    'Grinding brakes',
    'Soft brake pedal',
    'Brake warning light',
    'Pulling to one side',
    'ABS issues',
  ],
  'Exhaust/Emissions': [
    'Check engine light',
    'DPF warning',
    'DEF issues',
    'EGR problems',
    'Exhaust leak',
    'Failed emissions',
  ],
  'Other': [
    'Unusual vibrations',
    'Steering issues',
    'Suspension problems',
    'Fuel efficiency drop',
    'Oil consumption high',
    'Coolant leak',
  ],
};

export default function SymptomPicker({ open, onClose, onSelect, selectedSymptoms = [] }) {
  const [selected, setSelected] = useState(new Set(selectedSymptoms));

  const toggleSymptom = (symptom) => {
    const newSelected = new Set(selected);
    if (newSelected.has(symptom)) {
      newSelected.delete(symptom);
    } else {
      newSelected.add(symptom);
    }
    setSelected(newSelected);
  };

  const handleConfirm = () => {
    onSelect(Array.from(selected));
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#141414] border-white/10 text-white max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
            </div>
            Select Symptoms
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 pr-2 pt-4">
          {Object.entries(SYMPTOM_CATEGORIES).map(([category, symptoms]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-white/60 mb-3">{category}</h3>
              <div className="flex flex-wrap gap-2">
                {symptoms.map((symptom) => (
                  <motion.button
                    key={symptom}
                    onClick={() => toggleSymptom(symptom)}
                    whileTap={{ scale: 0.95 }}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      selected.has(symptom)
                        ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50'
                        : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {selected.has(symptom) && <Check className="w-3 h-3 inline mr-1" />}
                    {symptom}
                  </motion.button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-white/10 pt-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-white/40">
              {selected.size} symptom{selected.size !== 1 ? 's' : ''} selected
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onClose}
                className="border-white/20 hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
              >
                Confirm Selection
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}