import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
  MapPin,
  Wrench,
  X,
  Plus,
} from 'lucide-react';

export default function RoadsideContextPanel({ context, onChange }) {
  const update = (key, value) => {
    onChange({ ...context, [key]: value });
  };

  return (
    <div className="space-y-4">
      {/* Mode Selector */}
      <div className="flex gap-2">
        <Button
          variant={context.mode === 'roadside' ? 'default' : 'outline'}
          size="sm"
          onClick={() => update('mode', 'roadside')}
          className={context.mode === 'roadside'
            ? 'bg-orange-500 hover:bg-orange-600 text-white'
            : 'border-white/20 text-white/70 hover:bg-white/10'
          }
        >
          <MapPin className="w-4 h-4 mr-2" />
          Roadside / Breakdown
        </Button>
        <Button
          variant={context.mode === 'shop' ? 'default' : 'outline'}
          size="sm"
          onClick={() => update('mode', 'shop')}
          className={context.mode === 'shop'
            ? 'bg-blue-500 hover:bg-blue-600 text-white'
            : 'border-white/20 text-white/70 hover:bg-white/10'
          }
        >
          <Wrench className="w-4 h-4 mr-2" />
          Shop / Follow-up
        </Button>
      </div>

      {/* VIN + Fault Codes */}
      <Card className="bg-white/5 border-white/10 p-4 space-y-4">
        {/* VIN Field */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-white/60">VIN (optional)</label>
          <Input
            value={context.vin || ''}
            onChange={(e) => update('vin', e.target.value.toUpperCase())}
            placeholder="e.g., 1XKAD49X0XJ000000"
            maxLength={17}
            className="bg-white/5 border-white/10 text-white h-9 text-sm font-mono"
          />
        </div>

        <Separator className="bg-white/10" />

        {/* Fault Codes */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-white/60">Fault codes (optional)</label>
          <div className="flex items-center gap-2 mb-2">
            <Checkbox
              id="no-codes"
              checked={context.noCodesAvailable || false}
              onCheckedChange={(checked) => {
                update('noCodesAvailable', checked);
                if (checked) {
                  update('faultCodes', []);
                }
              }}
              className="border-white/30 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
            />
            <label htmlFor="no-codes" className="text-xs text-white/60 cursor-pointer">
              No active fault codes available
            </label>
          </div>
          {!context.noCodesAvailable && (
            <FaultCodeInput
              codes={context.faultCodes || []}
              historyCodes={context.historyFaultCodes || []}
              onChange={(codes) => update('faultCodes', codes)}
              onHistoryChange={(codes) => update('historyFaultCodes', codes)}
            />
          )}
        </div>
      </Card>
    </div>
  );
}

/* ---------- Inline Fault Code Input ---------- */
function FaultCodeInput({ codes, historyCodes, onChange, onHistoryChange }) {
  const [inputValue, setInputValue] = useState('');
  const [historyInput, setHistoryInput] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const validateCode = (code) => {
    const patterns = [
      /^[PCBU][0-3][0-9]{3}$/i,
      /^SPN\s?\d{1,5}$/i,
      /^FMI\s?\d{1,2}$/i,
      /^[A-Z]{2,3}\d{3,5}$/i,
    ];
    return patterns.some(p => p.test(code.trim()));
  };

  const addCode = (value, list, setList, setInput) => {
    const code = value.trim().toUpperCase();
    if (!code) return;
    if (!validateCode(code)) return;
    if (list.includes(code)) return;
    setList([...list, code]);
    setInput('');
  };

  return (
    <div className="space-y-2">
      {/* Active codes */}
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addCode(inputValue, codes, onChange, setInputValue);
            }
          }}
          placeholder="Active code, e.g., P0300, SPN 520"
          className="bg-white/5 border-white/10 text-white h-8 text-xs flex-1"
        />
        <Button
          size="sm"
          variant="outline"
          onClick={() => addCode(inputValue, codes, onChange, setInputValue)}
          className="h-8 px-2 border-white/20 text-white/60"
        >
          <Plus className="w-3 h-3" />
        </Button>
      </div>
      {codes.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {codes.map(code => (
            <Badge key={code} className="bg-red-500/20 text-red-400 border border-red-500/30 text-xs">
              {code}
              <button onClick={() => onChange(codes.filter(c => c !== code))} className="ml-1 hover:text-red-200">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* History/inactive codes toggle */}
      <button
        onClick={() => setShowHistory(!showHistory)}
        className="text-xs text-white/40 hover:text-white/60 underline"
      >
        {showHistory ? 'Hide' : 'Add'} history/inactive codes
      </button>

      {showHistory && (
        <div className="space-y-2 pl-2 border-l-2 border-white/10">
          <div className="flex gap-2">
            <Input
              value={historyInput}
              onChange={(e) => setHistoryInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addCode(historyInput, historyCodes, onHistoryChange, setHistoryInput);
                }
              }}
              placeholder="History code..."
              className="bg-white/5 border-white/10 text-white h-8 text-xs flex-1"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => addCode(historyInput, historyCodes, onHistoryChange, setHistoryInput)}
              className="h-8 px-2 border-white/20 text-white/60"
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>
          {historyCodes.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {historyCodes.map(code => (
                <Badge key={code} className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-xs">
                  {code} (history)
                  <button onClick={() => onHistoryChange(historyCodes.filter(c => c !== code))} className="ml-1">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
