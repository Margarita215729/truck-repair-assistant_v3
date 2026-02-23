import React, { useState, useRef, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Plus, X, Check, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ErrorCodeInput({ open, onClose, onSubmit, currentCodes = [] }) {
  const [codes, setCodes] = useState(currentCodes);
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef(null);
  const panelRef = useRef(null);

  // Focus input when panel opens
  useEffect(() => {
    if (open) {
      setCodes(currentCodes);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, currentCodes]);

  const validateCode = (code) => {
    const patterns = [
      /^[PCBU][0-3][0-9]{3}$/i,
      /^SPN\s?\d{1,5}$/i,
      /^FMI\s?\d{1,2}$/i,
      /^[A-Z]{2,3}\d{3,5}$/i,
    ];
    return patterns.some(p => p.test(code.trim()));
  };

  const addCode = () => {
    const code = inputValue.trim().toUpperCase();
    if (!code) return;
    if (!validateCode(code)) {
      setError('Format: P0300, SPN 520, U0100');
      return;
    }
    if (codes.includes(code)) {
      setError('Already added');
      return;
    }
    setCodes([...codes, code]);
    setInputValue('');
    setError('');
  };

  const removeCode = (code) => {
    setCodes(codes.filter(c => c !== code));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCode();
    }
  };

  const handleSubmit = () => {
    onSubmit(codes);
    onClose();
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60"
            onClick={onClose}
          />
          {/* Bottom sheet panel */}
          <motion.div
            ref={panelRef}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-[#1a1a1a] rounded-t-2xl border-t border-white/10 max-h-[70vh] flex flex-col"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <span className="font-semibold text-white">Error Codes</span>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-white/50">
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>

            {/* Input row — always at top, visible above keyboard */}
            <div className="px-4 pb-3">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => { setInputValue(e.target.value); setError(''); }}
                  onKeyDown={handleKeyDown}
                  placeholder="P0300, SPN 520..."
                  autoComplete="off"
                  autoCapitalize="characters"
                  className="flex-1 h-11 px-3 rounded-xl bg-white/5 border border-white/15 text-white placeholder:text-white/30 text-base outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/30"
                />
                <button
                  onClick={addCode}
                  className="h-11 w-11 shrink-0 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 flex items-center justify-center transition-all"
                >
                  <Plus className="w-5 h-5 text-white" />
                </button>
              </div>
              {error && <p className="text-xs text-red-400 mt-1.5">{error}</p>}
            </div>

            {/* Added codes */}
            <div className="px-4 flex-1 overflow-y-auto pb-2">
              {codes.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {codes.map((code) => (
                    <Badge
                      key={code}
                      variant="secondary"
                      className="bg-red-500/15 text-red-400 border border-red-500/25 pl-3 pr-1.5 py-1.5 text-sm"
                    >
                      {code}
                      <button onClick={() => removeCode(code)} className="ml-1.5 p-0.5 rounded hover:bg-white/10">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Submit button */}
            <div className="px-4 pb-4 pt-2 safe-bottom">
              <button
                onClick={handleSubmit}
                disabled={codes.length === 0}
                className="w-full h-12 rounded-xl font-semibold text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 active:scale-[0.98] disabled:opacity-40 disabled:scale-100 flex items-center justify-center gap-2 transition-all"
              >
                <Check className="w-4 h-4" />
                {codes.length > 0 
                  ? `Analyze ${codes.length} Code${codes.length > 1 ? 's' : ''}`
                  : 'Add a code first'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}