import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, MapPin, Navigation, ArrowUpDown, ArrowLeftRight, Weight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/lib/LanguageContext';

const TYPE_LABELS = {
  height: 'heightLimit',
  weight: 'weightLimit',
  width: 'widthLimit',
  length: 'lengthLimit',
  combined: 'restrictions',
  bridge: 'heightLimit',
  tunnel: 'heightLimit',
  road: 'restrictions',
};

export default function TruckRestrictionCard({ restriction, isSelected, onClick }) {
  const { t } = useLanguage();

  const hasLimits = restriction.height_ft || restriction.weight_tons || restriction.width_ft || restriction.length_ft;

  return (
    <motion.div whileTap={{ scale: 0.98 }} onClick={onClick}>
      <Card className={`p-4 cursor-pointer transition-all ${
        isSelected 
          ? 'bg-white/10 border-amber-500/50' 
          : 'bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/20'
      }`}>
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-amber-500/20">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-white truncate">{restriction.name}</h3>
              <Badge variant="outline" className="bg-amber-500/20 text-amber-400 border-amber-500/30 shrink-0 text-xs capitalize">
                {restriction.restriction_type}
              </Badge>
            </div>

            {restriction.road_name && (
              <p className="text-xs text-amber-400/80 mt-0.5">{restriction.road_name}</p>
            )}

            {restriction.description && (
              <p className="text-xs text-white/50 mt-1">{restriction.description}</p>
            )}

            {/* Limit values */}
            {hasLimits && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                {restriction.height_ft && (
                  <div className="flex items-center gap-1.5 bg-amber-500/10 rounded-lg px-2 py-1.5">
                    <ArrowUpDown className="w-3.5 h-3.5 text-amber-400" />
                    <div>
                      <p className="text-xs text-white/40">{t('services.heightLimit')}</p>
                      <p className="text-sm font-semibold text-amber-400">{restriction.height_ft} {t('services.restrictionFt')}</p>
                    </div>
                  </div>
                )}
                {restriction.weight_tons && (
                  <div className="flex items-center gap-1.5 bg-amber-500/10 rounded-lg px-2 py-1.5">
                    <Weight className="w-3.5 h-3.5 text-amber-400" />
                    <div>
                      <p className="text-xs text-white/40">{t('services.weightLimit')}</p>
                      <p className="text-sm font-semibold text-amber-400">{restriction.weight_tons} {t('services.restrictionTons')}</p>
                    </div>
                  </div>
                )}
                {restriction.width_ft && (
                  <div className="flex items-center gap-1.5 bg-amber-500/10 rounded-lg px-2 py-1.5">
                    <ArrowLeftRight className="w-3.5 h-3.5 text-amber-400" />
                    <div>
                      <p className="text-xs text-white/40">{t('services.widthLimit')}</p>
                      <p className="text-sm font-semibold text-amber-400">{restriction.width_ft} {t('services.restrictionFt')}</p>
                    </div>
                  </div>
                )}
                {restriction.length_ft && (
                  <div className="flex items-center gap-1.5 bg-amber-500/10 rounded-lg px-2 py-1.5">
                    <ArrowLeftRight className="w-3.5 h-3.5 text-amber-400" />
                    <div>
                      <p className="text-xs text-white/40">{t('services.lengthLimit')}</p>
                      <p className="text-sm font-semibold text-amber-400">{restriction.length_ft} {t('services.restrictionFt')}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Detour info */}
            {restriction.detour_info && (
              <p className="text-xs text-blue-400 mt-2">
                {t('services.detour')}: {restriction.detour_info}
              </p>
            )}

            {/* Status */}
            <div className="flex items-center gap-2 mt-2">
              {restriction.is_active ? (
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">
                  {t('services.active')}
                </Badge>
              ) : (
                <Badge className="bg-white/10 text-white/40 border-white/20 text-xs">
                  Inactive
                </Badge>
              )}
              {!restriction.expiration_date && (
                <Badge variant="secondary" className="bg-white/5 text-white/60 text-xs border-0">
                  {t('services.permanent')}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2 mt-3">
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(`https://www.google.com/maps/dir/?api=1&destination=${restriction.lat},${restriction.lng}`);
                }}
                className="h-8 border-white/20 hover:bg-white/10"
              >
                <Navigation className="w-3 h-3 mr-1" /> View on Map
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
