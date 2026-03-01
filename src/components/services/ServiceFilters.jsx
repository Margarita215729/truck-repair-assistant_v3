import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Wrench, 
  Zap, 
  Gauge, 
  Car,
  Sun,
  Moon,
  Star,
  X,
  Settings,
  ParkingCircle,
  Scale,
  AlertTriangle,
  Layers
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/lib/LanguageContext';

const SERVICE_TYPES = [
  { id: 'semi_truck_service', label: 'Semi-Truck Service', icon: Wrench },
  { id: 'tires', label: 'Tires', icon: Gauge },
  { id: 'truck_wash', label: 'Truck Wash', icon: Car },
  { id: 'oil_change', label: 'Oil Change', icon: Settings },
];

export default function ServiceFilters({ filters, onFilterChange, infraCounts = {} }) {
  const { t } = useLanguage();

  const toggleServiceType = (typeId) => {
    const current = filters.serviceTypes || [];
    const updated = current.includes(typeId)
      ? current.filter(t => t !== typeId)
      : [...current, typeId];
    onFilterChange({ ...filters, serviceTypes: updated });
  };

  const toggleLayer = (layer) => {
    onFilterChange({ ...filters, [layer]: !filters[layer] });
  };

  const clearFilters = () => {
    onFilterChange({ 
      ...filters,
      serviceTypes: [], 
      is24Hours: false, 
      minRating: 0 
    });
  };

  const hasActiveFilters = 
    (filters.serviceTypes?.length > 0) || 
    filters.is24Hours || 
    filters.minRating > 0;

  return (
    <Card className="p-4 bg-white/5 border-white/10">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Wrench className="w-4 h-4 text-orange-500" />
          Filters
        </h3>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-7 text-xs text-white/60 hover:text-white"
          >
            <X className="w-3 h-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Service Types */}
      <div className="space-y-3">
        <label className="text-xs text-white/60 font-medium">Service Type</label>
        <div className="flex flex-wrap gap-2">
          {SERVICE_TYPES.map((type) => {
            const Icon = type.icon;
            const isActive = filters.serviceTypes?.includes(type.id);
            return (
              <motion.button
                key={type.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => toggleServiceType(type.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-orange-500 text-white'
                    : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {type.label}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* 24/7 and Rating Filters */}
      <div className="grid grid-cols-2 gap-3 mt-4">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => onFilterChange({ ...filters, is24Hours: !filters.is24Hours })}
          className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
            filters.is24Hours
              ? 'bg-blue-500 text-white'
              : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
          }`}
        >
          <Moon className="w-4 h-4" />
          24/7
        </motion.button>

        <div className="flex items-center gap-1">
          {[4, 4.5, 5].map((rating) => (
            <motion.button
              key={rating}
              whileTap={{ scale: 0.95 }}
              onClick={() => onFilterChange({ 
                ...filters, 
                minRating: filters.minRating === rating ? 0 : rating 
              })}
              className={`flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-xs font-medium transition-all ${
                filters.minRating === rating
                  ? 'bg-yellow-500 text-black'
                  : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Star className="w-3 h-3 fill-current" />
              {rating}+
            </motion.button>
          ))}
        </div>
      </div>

      {/* Infrastructure Layers */}
      <div className="space-y-3 mt-4 pt-4 border-t border-white/10">
        <label className="text-xs text-white/60 font-medium flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5" />
          {t('services.layers')}
        </label>
        <div className="flex flex-wrap gap-2">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => toggleLayer('showTruckParking')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filters.showTruckParking
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-transparent'
            }`}
          >
            <ParkingCircle className="w-3.5 h-3.5" />
            {t('services.truckParking')}
            {infraCounts.truckParking > 0 && <span className="ml-1 text-[10px] opacity-70">({infraCounts.truckParking})</span>}
          </motion.button>
          
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => toggleLayer('showWeighStations')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filters.showWeighStations
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-transparent'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            {t('services.weighStations')}
            {infraCounts.weighStations > 0 && <span className="ml-1 text-[10px] opacity-70">({infraCounts.weighStations})</span>}
          </motion.button>
          
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => toggleLayer('showRestrictions')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filters.showRestrictions
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-transparent'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            {t('services.restrictions')}
            {infraCounts.restrictions > 0 && <span className="ml-1 text-[10px] opacity-70">({infraCounts.restrictions})</span>}
          </motion.button>
        </div>
      </div>
    </Card>
  );
}
