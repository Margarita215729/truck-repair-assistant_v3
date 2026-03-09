import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Filter, X } from 'lucide-react';

const URGENCY_OPTIONS = [
  { value: 'all', label: 'Any urgency' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const TOW_OPTIONS = [
  { value: 'all', label: 'Any tow status' },
  { value: 'yes', label: 'Tow recommended' },
  { value: 'no', label: 'No tow needed' },
];

const FORMAT_OPTIONS = [
  { value: 'all', label: 'All formats' },
  { value: 'new', label: 'New (Intake & Triage)' },
  { value: 'legacy', label: 'Legacy' },
];

const CODES_OPTIONS = [
  { value: 'all', label: 'Any codes status' },
  { value: 'yes', label: 'Has active codes' },
  { value: 'no', label: 'No active codes' },
];

/**
 * ReportFilters — collapsible filter bar for the Reports page.
 *
 * Props:
 *   filters: { urgency, hasTow, canDrive, format, hasCodes, truckMake, dateFrom, dateTo }
 *   onChange(filters)
 *   makes: string[]  — unique truck makes in loaded reports
 */
export default function ReportFilters({ filters, onChange, makes = [] }) {
  const [open, setOpen] = React.useState(false);

  const set = (key, value) => onChange({ ...filters, [key]: value });

  const hasActiveFilters = filters.urgency || filters.hasTow != null ||
    filters.format || filters.hasCodes != null || filters.truckMake ||
    filters.dateFrom || filters.dateTo;

  const clearAll = () => onChange({});

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOpen(!open)}
          className={`border-white/20 hover:bg-white/10 ${hasActiveFilters ? 'text-orange-400 border-orange-500/30' : 'text-white/60'}`}
        >
          <Filter className="w-4 h-4 mr-1.5" />
          Filters
          {hasActiveFilters && (
            <Badge className="ml-1.5 bg-orange-500/20 text-orange-400 border-none text-[10px] px-1.5">
              ON
            </Badge>
          )}
        </Button>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="text-white/40 hover:text-white/80 text-xs"
          >
            <X className="w-3 h-3 mr-1" /> Clear
          </Button>
        )}
      </div>

      {open && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
          {/* Urgency */}
          <Select value={filters.urgency || 'all'} onValueChange={v => set('urgency', v === 'all' ? null : v)}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white/80 h-9 text-xs">
              <SelectValue placeholder="Urgency" />
            </SelectTrigger>
            <SelectContent>
              {URGENCY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* Tow */}
          <Select value={filters.hasTow == null ? 'all' : filters.hasTow ? 'yes' : 'no'}
            onValueChange={v => set('hasTow', v === 'all' ? null : v === 'yes')}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white/80 h-9 text-xs">
              <SelectValue placeholder="Tow" />
            </SelectTrigger>
            <SelectContent>
              {TOW_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* Format */}
          <Select value={filters.format || 'all'} onValueChange={v => set('format', v === 'all' ? null : v)}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white/80 h-9 text-xs">
              <SelectValue placeholder="Format" />
            </SelectTrigger>
            <SelectContent>
              {FORMAT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* Active codes */}
          <Select value={filters.hasCodes == null ? 'all' : filters.hasCodes ? 'yes' : 'no'}
            onValueChange={v => set('hasCodes', v === 'all' ? null : v === 'yes')}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white/80 h-9 text-xs">
              <SelectValue placeholder="Codes" />
            </SelectTrigger>
            <SelectContent>
              {CODES_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* Truck make */}
          {makes.length > 0 && (
            <Select value={filters.truckMake || 'all'} onValueChange={v => set('truckMake', v === 'all' ? null : v)}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white/80 h-9 text-xs">
                <SelectValue placeholder="Truck make" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any make</SelectItem>
                {makes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          )}

          {/* Date from */}
          <Input
            type="date"
            value={filters.dateFrom || ''}
            onChange={e => set('dateFrom', e.target.value || null)}
            placeholder="From"
            className="bg-white/5 border-white/10 text-white/80 h-9 text-xs"
          />

          {/* Date to */}
          <Input
            type="date"
            value={filters.dateTo || ''}
            onChange={e => set('dateTo', e.target.value || null)}
            placeholder="To"
            className="bg-white/5 border-white/10 text-white/80 h-9 text-xs"
          />
        </div>
      )}
    </div>
  );
}
