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
  { value: 'all', label: 'Any Importance' },
  { value: 'required', label: 'Required' },
  { value: 'recommended', label: 'Recommended' },
  { value: 'optional', label: 'Optional' },
];

const URGENCY = [
  { value: 'all', label: 'Any Urgency' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const DRIVEABILITY = [
  { value: 'all', label: 'Any Driveability' },
  { value: 'do_not_drive', label: 'Do Not Drive' },
  { value: 'limp_mode', label: 'Limp Mode' },
  { value: 'reduced_performance', label: 'Reduced Performance' },
  { value: 'safe_to_drive', label: 'Safe to Drive' },
];

const ACTION_TYPES = [
  { value: 'all', label: 'Any Action' },
  { value: 'replace_now', label: 'Replace Now' },
  { value: 'inspect_first', label: 'Inspect First' },
  { value: 'order_ahead', label: 'Order Ahead' },
  { value: 'monitor', label: 'Monitor' },
];

const CONDITIONS = [
  { value: 'all', label: 'Any Condition' },
  { value: 'new', label: 'New' },
  { value: 'used', label: 'Used' },
  { value: 'refurbished', label: 'Refurbished' }
];

const SOURCE_TYPES = [
  { value: 'all', label: 'All Sources' },
  { value: 'manufacturer', label: 'Manufacturer (OEM)' },
  { value: 'authorized_dealer', label: 'Authorized Dealer' },
  { value: 'specialist_vendor', label: 'Specialist Vendor' },
  { value: 'aftermarket_vendor', label: 'Aftermarket' },
  { value: 'marketplace', label: 'Marketplace' },
];

const SOURCE_TIERS = [
  { value: 'all', label: 'All Tiers' },
  { value: '1', label: 'Tier 1 — OEM / Manufacturer' },
  { value: '2', label: 'Tier 2 — Authorized / Specialist' },
  { value: '3', label: 'Tier 3 — Aftermarket' },
  { value: '4', label: 'Tier 4 — Marketplace' },
];

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Most Relevant' },
  { value: 'trust', label: 'Trust (Tier)' },
  { value: 'price_asc', label: 'Price: Low → High' },
  { value: 'price_desc', label: 'Price: High → Low' }
];

/**
 * Dual-mode filter component.
 * mode="recommended" — filters for AI-recommended parts (category, urgency, driveability, action_type, importance)
 * mode="search" — filters for live vendor search (condition, sourceType, sourceTier, sort)
 */
export default function PartFilters({ filters, onFiltersChange, mode = 'recommended' }) {
  const updateFilter = (key, value) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  if (mode === 'search') {
    return (
      <div className="p-4 rounded-xl bg-white/5 border border-white/10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
            <label className="text-xs text-white/60 mb-2 block">Source Type</label>
            <Select value={filters.sourceType || 'all'} onValueChange={(v) => updateFilter('sourceType', v)}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_TYPES.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs text-white/60 mb-2 block">Trust Tier</label>
            <Select value={filters.sourceTier || 'all'} onValueChange={(v) => updateFilter('sourceTier', v)}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_TIERS.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
          <label className="text-xs text-white/60 mb-2 block">Urgency</label>
          <Select value={filters.urgency || 'all'} onValueChange={(v) => updateFilter('urgency', v)}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {URGENCY.map(u => (
                <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs text-white/60 mb-2 block">Driveability</label>
          <Select value={filters.driveability || 'all'} onValueChange={(v) => updateFilter('driveability', v)}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DRIVEABILITY.map(d => (
                <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs text-white/60 mb-2 block">Action</label>
          <Select value={filters.action_type || 'all'} onValueChange={(v) => updateFilter('action_type', v)}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACTION_TYPES.map(a => (
                <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs text-white/60 mb-2 block">Importance</label>
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
