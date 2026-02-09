import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Plus, X, Info } from 'lucide-react';

export default function ErrorCodeInput({ open, onClose, onSubmit, currentCodes = [] }) {
  const [codes, setCodes] = useState(currentCodes);
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');

  const validateCode = (code) => {
    // Common truck error code patterns: P0XXX, P1XXX, P2XXX, U0XXX, B0XXX, C0XXX, SPN XXX, etc.
    const patterns = [
      /^[PCBU][0-3][0-9]{3}$/i,  // Standard OBD codes
      /^SPN\s?\d{1,5}$/i,        // SPN codes
      /^FMI\s?\d{1,2}$/i,        // FMI codes
      /^[A-Z]{2,3}\d{3,5}$/i,    // Various manufacturer codes
    ];
    return patterns.some(p => p.test(code.trim()));
  };

  const addCode = () => {
    const code = inputValue.trim().toUpperCase();
    if (!code) return;
    
    if (!validateCode(code)) {
      setError('Invalid code format. Examples: P0300, SPN 520, U0100');
      return;
    }
    
    if (codes.includes(code)) {
      setError('This code has already been added');
      return;
    }
    
    setCodes([...codes, code]);
    setInputValue('');
    setError('');
  };

  const removeCode = (code) => {
    setCodes(codes.filter(c => c !== code));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCode();
    }
  };

  const handleSubmit = () => {
    onSubmit(codes);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#141414] border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500/20 to-red-600/20 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-500" />
            </div>
            Enter Error Codes
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-4">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
              <p className="text-sm text-blue-300/80">
                Enter diagnostic trouble codes from your truck's OBD system. 
                Supported formats: P0300, SPN 520, FMI 4, U0100, etc.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-white/60 font-medium">Add Error Code</label>
            <div className="flex gap-2">
              <Input
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  setError('');
                }}
                onKeyPress={handleKeyPress}
                placeholder="e.g., P0300, SPN 520"
                className="bg-white/5 border-white/10 text-white h-12 flex-1"
              />
              <Button
                onClick={addCode}
                className="h-12 px-4 bg-white/10 hover:bg-white/20"
              >
                <Plus className="w-5 h-5" />
              </Button>
            </div>
            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}
          </div>

          {codes.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm text-white/60 font-medium">Added Codes</label>
              <div className="flex flex-wrap gap-2">
                {codes.map((code) => (
                  <Badge
                    key={code}
                    variant="secondary"
                    className="bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1.5 text-sm"
                  >
                    {code}
                    <button
                      onClick={() => removeCode(code)}
                      className="ml-2 hover:text-red-300"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={codes.length === 0}
            className="w-full h-12 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:opacity-50"
          >
            {codes.length > 0 
              ? `Analyze ${codes.length} Code${codes.length > 1 ? 's' : ''}`
              : 'Add at least one code'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}