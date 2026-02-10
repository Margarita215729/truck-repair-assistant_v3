import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  AlertTriangle,
  MapPin,
  Wrench,
  Clock,
  Fuel,
  Thermometer,
  ChevronDown,
  ChevronUp,
  Shield,
  X,
  Plus,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const WHEN_OPTIONS = [
  { value: 'under_load', label: 'Under load' },
  { value: 'idle', label: 'Idle' },
  { value: 'cold_start', label: 'Cold start' },
  { value: 'after_fueling', label: 'After fueling' },
  { value: 'during_regen', label: 'During regen' },
  { value: 'intermittent', label: 'Intermittent' },
  { value: 'constant', label: 'Constant' },
  { value: 'unknown', label: 'Unknown' },
];

const RECENT_EVENTS = [
  { value: 'fuel_stop', label: 'Fuel stop' },
  { value: 'long_idle', label: 'Long idle' },
  { value: 'cold_weather', label: 'Cold weather' },
  { value: 'filter_change', label: 'Filter change' },
  { value: 'recent_repair', label: 'Recent repair' },
  { value: 'jump_start', label: 'Jump start' },
  { value: 'steep_grade', label: 'Steep grade / mountain' },
  { value: 'heavy_load', label: 'Heavy load' },
];

export default function RoadsideContextPanel({ context, onChange }) {
  const [expanded, setExpanded] = useState(true);

  const update = (key, value) => {
    onChange({ ...context, [key]: value });
  };

  const toggleRecentEvent = (event) => {
    const current = context.recentEvents || [];
    if (current.includes(event)) {
      update('recentEvents', current.filter(e => e !== event));
    } else {
      update('recentEvents', [...current, event]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Safety Notice */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-3 rounded-xl bg-red-500/10 border border-red-500/30"
      >
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-300">Safety First</p>
            <p className="text-xs text-red-300/70 mt-1">
              If you smell fuel, see smoke/fire, or have severe overheating — stop immediately and call roadside assistance.
            </p>
          </div>
        </div>
      </motion.div>

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

      {/* Expandable Context Section */}
      <Card className="bg-white/5 border-white/10 overflow-hidden">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-orange-400" />
            <span className="text-sm font-medium text-white">Situation Details</span>
            {!expanded && (context.whenItHappens || context.recentEvents?.length > 0) && (
              <Badge variant="outline" className="text-xs border-orange-500/30 text-orange-400 ml-2">
                {[context.whenItHappens, ...(context.recentEvents || [])].filter(Boolean).length} details
              </Badge>
            )}
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
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
              <div className="px-4 pb-4 space-y-4">
                <Separator className="bg-white/10" />

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
                  <p className="text-xs text-white/40">
                    VIN improves exact configuration and parts matching, but diagnostics can start without it.
                  </p>
                  {!context.vin && (
                    <button
                      onClick={() => {/* no-op, placeholder for future */}}
                      className="text-xs text-orange-400 hover:text-orange-300 underline"
                    >
                      + Add VIN later
                    </button>
                  )}
                </div>

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

                <Separator className="bg-white/10" />

                {/* When does it happen? */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-white/60">When does it happen?</label>
                  <Select
                    value={context.whenItHappens || ''}
                    onValueChange={(v) => update('whenItHappens', v)}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10 text-white h-9 text-sm">
                      <SelectValue placeholder="Select condition..." />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1a] border-white/10">
                      {WHEN_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value} className="text-white hover:bg-white/10">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Recent events */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-white/60">Recent events</label>
                  <div className="flex flex-wrap gap-2">
                    {RECENT_EVENTS.map(evt => {
                      const selected = (context.recentEvents || []).includes(evt.value);
                      return (
                        <Badge
                          key={evt.value}
                          variant="outline"
                          onClick={() => toggleRecentEvent(evt.value)}
                          className={`cursor-pointer transition-colors text-xs py-1 ${
                            selected
                              ? 'bg-orange-500/20 text-orange-400 border-orange-500/40'
                              : 'bg-white/5 text-white/60 border-white/20 hover:bg-white/10'
                          }`}
                        >
                          {evt.label}
                        </Badge>
                      );
                    })}
                  </div>
                </div>

                {/* Dashboard message */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-white/60">Dashboard message / warning</label>
                  <Input
                    value={context.dashboardMessage || ''}
                    onChange={(e) => update('dashboardMessage', e.target.value)}
                    placeholder='e.g., "Check Engine", "High Exhaust Temp", warning light...'
                    className="bg-white/5 border-white/10 text-white h-9 text-sm"
                  />
                </div>

                {/* Checks already done */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-white/60">What have you already checked or replaced?</label>
                  <Textarea
                    value={context.checksAlreadyDone || ''}
                    onChange={(e) => update('checksAlreadyDone', e.target.value)}
                    placeholder="e.g., Checked coolant level — OK. Replaced fuel filter last week."
                    className="bg-white/5 border-white/10 text-white text-sm min-h-[60px] resize-none"
                    rows={2}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
