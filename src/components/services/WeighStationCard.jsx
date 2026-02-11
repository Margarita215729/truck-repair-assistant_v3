import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Scale, MapPin, Clock, Navigation, Phone } from 'lucide-react';
import { motion } from 'framer-motion';
import { weighStationColor } from '@/services/truckInfraService';
import { useLanguage } from '@/lib/LanguageContext';

export default function WeighStationCard({ station, isSelected, onClick }) {
  const { t } = useLanguage();
  const statusClass = weighStationColor(station.status);

  const statusLabel = {
    open: t('services.weighStationOpen'),
    closed: t('services.weighStationClosed'),
    unknown: t('services.occupancyUnknown'),
  };

  const scaleLabel = {
    static: t('services.scaleTypeStatic'),
    weigh_in_motion: t('services.scaleTypeWIM'),
    both: t('services.scaleTypeBoth'),
  };

  return (
    <motion.div whileTap={{ scale: 0.98 }} onClick={onClick}>
      <Card className={`p-4 cursor-pointer transition-all ${
        isSelected 
          ? 'bg-white/10 border-purple-500/50' 
          : 'bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/20'
      }`}>
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-purple-500/20">
            <Scale className="w-6 h-6 text-purple-500" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-white truncate">{station.name}</h3>
              <Badge variant="outline" className={`${statusClass} shrink-0 text-xs`}>
                {statusLabel[station.status] || statusLabel.unknown}
              </Badge>
            </div>

            {station.highway && (
              <p className="text-xs text-purple-400/80 mt-0.5">
                {station.highway} {station.direction && `(${station.direction})`}
              </p>
            )}

            <p className="text-sm text-white/50 mt-1 truncate flex items-center gap-1">
              <MapPin className="w-3 h-3 shrink-0" />
              {station.address}
            </p>

            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge variant="secondary" className="bg-white/5 text-white/60 text-xs border-0">
                {scaleLabel[station.scale_type] || station.scale_type}
              </Badge>
              {station.has_prepass && (
                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
                  PrePass
                </Badge>
              )}
              {station.has_bypass && (
                <Badge className="bg-indigo-500/20 text-indigo-400 border-indigo-500/30 text-xs">
                  {t('services.bypass')}
                </Badge>
              )}
            </div>

            {station.hours && (
              <p className="text-xs text-white/40 mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {station.hours}
              </p>
            )}

            <div className="flex items-center gap-2 mt-3">
              {station.phone && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => { e.stopPropagation(); window.open(`tel:${station.phone}`); }}
                  className="h-8 border-white/20 hover:bg-white/10"
                >
                  <Phone className="w-3 h-3 mr-1" /> Call
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(`https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`);
                }}
                className="h-8 border-white/20 hover:bg-white/10"
              >
                <Navigation className="w-3 h-3 mr-1" /> Directions
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
