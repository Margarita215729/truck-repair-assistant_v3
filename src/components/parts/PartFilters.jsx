import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

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

const PART_TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'OEM', label: 'OEM' },
  { value: 'aftermarket', label: 'Aftermarket' },
  { value: 'remanufactured', label: 'Remanufactured' }
];

export default function PartFilters({ filters, onFiltersChange }) {
  const updateFilter = (key, value) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-xs text-white/60 mb-2 block">Category</label>
          <Select value={filters.category} onValueChange={(value) => updateFilter('category', value)}>
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
          <label className="text-xs text-white/60 mb-2 block">Part Type</label>
          <Select value={filters.partType} onValueChange={(value) => updateFilter('partType', value)}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PART_TYPES.map(type => (
                <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs text-white/60 mb-2 block">Truck Make</label>
          <Input
            value={filters.make}
            onChange={(e) => updateFilter('make', e.target.value)}
            placeholder="e.g., Freightliner"
            className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
          />
        </div>
      </div>
    </div>
  );
}
