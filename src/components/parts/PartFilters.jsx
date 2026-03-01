import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'engine', label: 'Engine' },
  { value: 'transmission', label: 'Transmission' },
  { value: 'brakes', label: 'Brakes' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'exhaust', label: 'Exhaust' },
  { value: 'fuel_system', label: 'Fuel System' },
  { value: 'cooling', label: 'Cooling' },
  { value: 'suspension', label: 'Suspension' },
  { value: 'drivetrain', label: 'Drivetrain' },
  { value: 'filters', label: 'Filters' },
  { value: 'sensors', label: 'Sensors' },
  { value: 'other', label: 'Other' }
];

const IMPORTANCE = [
  { value: 'all', label: 'Any Source' },
  { value: 'oem', label: 'OEM / Dealer New' },
  { value: 'aftermarket', label: 'Aftermarket New' },
  { value: 'used', label: 'Used Parts' }
];

const DIFFICULTIES = [
  { value: 'all', label: 'Any Difficulty' },
  { value: 'easy', label: 'Easy — basic tools' },
  { value: 'moderate', label: 'Moderate — some experience' },
  { value: 'difficult', label: 'Difficult — advanced skills' },
  { value: 'professional', label: 'Professional only' }
];

const CONDITIONS = [
  { value: 'all', label: 'Any Condition' },
  { value: 'new', label: 'New' },
  { value: 'used', label: 'Used' },
  { value: 'refurbished', label: 'Refurbished' }
];

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Most Relevant' },
  { value: 'price_asc', label: 'Price: Low → High' },
  { value: 'price_desc', label: 'Price: High → Low' }
];

/**
 * Dual-mode filter component.
 * mode="recommended" — filters for AI-recommended parts (category, importance, difficulty)
 * mode="search" — filters for live vendor search results (condition, sort)
 */
export default function PartFilters({ filters, onFiltersChange, mode = 'recommended' }) {
  const updateFilter = (key, value) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  if (mode === 'search') {
    return (
      <div className="p-4 rounded-xl bg-white/5 border border-white/10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-white/60 mb-2 block">Condition</label>
            <Select value={filters.condition || 'all'} onValueChange={(v) => updateFilter('condition', v)}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONDITIONS.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs text-white/60 mb-2 block">Sort By</label>
            <Select value={filters.sort || 'relevance'} onValueChange={(v) => updateFilter('sort', v)}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    );
  }

  // mode === 'recommended'
  return (
    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-white/60 mb-2 block">Category</label>
          <Select value={filters.category || 'all'} onValueChange={(v) => updateFilter('category', v)}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(cat => (
                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs text-white/60 mb-2 block">Part Source</label>
          <Select value={filters.importance || 'all'} onValueChange={(v) => updateFilter('importance', v)}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {IMPORTANCE.map(imp => (
                <SelectItem key={imp.value} value={imp.value}>{imp.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
