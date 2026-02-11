import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ParkingCircle, MapPin, Clock, Navigation, Phone, Fuel, Wifi, ShowerHead } from 'lucide-react';
import { motion } from 'framer-motion';
import { occupancyColor, timeAgo } from '@/services/truckInfraService';
import { useLanguage } from '@/lib/LanguageContext';

const PARKING_TYPE_LABELS = {
  public_rest_area: 'parkingTypePublicRestArea',
  truck_stop: 'parkingTypeTruckStop',
  private: 'parkingTypePrivate',
  public: 'parkingTypePublic',
};

const AMENITY_ICONS = {
  fuel: '⛽',
  showers: '🚿',
  food: '🍔',
  wifi: '📶',
  scales: '⚖️',
  repair: '🔧',
  laundry: '👔',
  atm: '🏧',
};

export default function TruckParkingCard({ parking, isSelected, onClick }) {
  const { t } = useLanguage();
  const occupancyClass = occupancyColor(parking.occupancy_status);

  const statusLabel = {
    open: t('services.occupancyOpen'),
    partial: t('services.occupancyPartial'),
    full: t('services.occupancyFull'),
    unknown: t('services.occupancyUnknown'),
  };

  return (
    <motion.div whileTap={{ scale: 0.98 }} onClick={onClick}>
      <Card className={`p-4 cursor-pointer transition-all ${
        isSelected 
          ? 'bg-white/10 border-cyan-500/50' 
          : 'bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/20'
      }`}>
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-cyan-500/20">
            <ParkingCircle className="w-6 h-6 text-cyan-500" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-white truncate">{parking.name}</h3>
              <Badge variant="outline" className={`${occupancyClass} shrink-0 text-xs`}>
                {statusLabel[parking.occupancy_status] || statusLabel.unknown}
              </Badge>
            </div>

            {parking.operator && (
              <p className="text-xs text-cyan-400/80 mt-0.5">{parking.operator}</p>
            )}

            {/* Occupancy bar */}
            {parking.total_spaces > 0 && (
              <div className="mt-2">
                <div className="flex justify-between text-xs text-white/60 mb-1">
                  <span>{parking.available_spaces} / {parking.total_spaces} {t('services.availableSpaces').toLowerCase()}</span>
                  <span>{parking.occupancy_pct}%</span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      parking.occupancy_pct < 50 ? 'bg-green-500' :
                      parking.occupancy_pct < 85 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${parking.occupancy_pct}%` }}
                  />
                </div>
              </div>
            )}

            <p className="text-sm text-white/50 mt-1 truncate flex items-center gap-1">
              <MapPin className="w-3 h-3 shrink-0" />
              {parking.address}
            </p>

            {parking.occupancy_updated_at && (
              <p className="text-xs text-white/40 mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {t('services.lastUpdated')}: {timeAgo(parking.occupancy_updated_at)}
              </p>
            )}

            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="bg-white/5 text-white/60 text-xs border-0">
                {t(`services.${PARKING_TYPE_LABELS[parking.parking_type] || 'parkingTypePublic'}`)}
              </Badge>
              {parking.is24_hours && (
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                  <Clock className="w-3 h-3 mr-1" /> 24/7
                </Badge>
              )}
            </div>

            {/* Amenities */}
            {parking.amenities?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {parking.amenities.map((amenity, i) => (
                  <Badge key={i} variant="secondary" className="bg-cyan-500/10 text-cyan-400 text-xs border-0">
                    {AMENITY_ICONS[amenity] || '•'} {amenity}
                  </Badge>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 mt-3">
              {parking.phone && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => { e.stopPropagation(); window.open(`tel:${parking.phone}`); }}
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
                  window.open(`https://www.google.com/maps/dir/?api=1&destination=${parking.lat},${parking.lng}`);
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
