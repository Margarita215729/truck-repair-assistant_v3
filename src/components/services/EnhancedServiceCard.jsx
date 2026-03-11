import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Star, Phone, Navigation, Clock, MapPin,
  Wrench, ParkingCircle, Truck, MessageSquare,
  Shield, Zap, CheckCircle, Award,
} from 'lucide-react';
import { motion } from 'framer-motion';
import ReviewDialog from './ReviewDialog';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { SERVICE_TYPES } from '@/services/getHelpNowService';

const typeConfig = {
  repair:              { icon: Wrench,        label: 'Repair Shop',           color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  parking:             { icon: ParkingCircle,  label: 'Truck Parking',         color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  towing:              { icon: Truck,          label: 'Towing Service',        color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  heavy_duty_repair:   { icon: Wrench,        label: 'Heavy-Duty Repair',     color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  mobile_mechanic:     { icon: Phone,          label: 'Mobile Mechanic',       color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  towing_heavy_duty:   { icon: Truck,          label: 'Heavy-Duty Towing',     color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  tire_roadside:       { icon: Wrench,        label: 'Tire & Roadside',       color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  trailer_repair:      { icon: Wrench,        label: 'Trailer Repair',        color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  reefer_repair:       { icon: Wrench,        label: 'Reefer Repair',         color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
  aftertreatment_dpf_def: { icon: Wrench,     label: 'Aftertreatment / DPF',  color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  dealer_service:      { icon: Award,          label: 'Dealer Service',        color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' },
  truck_stop:          { icon: ParkingCircle,  label: 'Truck Stop',            color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  truck_parking:       { icon: ParkingCircle,  label: 'Truck Parking',         color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
  brake_suspension:    { icon: Wrench,        label: 'Brake & Suspension',    color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  electrical_diagnostics: { icon: Zap,        label: 'Electrical Diag.',      color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
};

const HD_CONFIDENCE = {
  high:   { label: 'Heavy-Duty Confirmed', color: 'bg-green-500/15 text-green-400 border-green-500/30' },
  medium: { label: 'Likely Heavy-Duty',    color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' },
  low:    null,
};

export default function EnhancedServiceCard({ service, isSelected, onClick, reviews = [], showIssueMatch = false }) {
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const queryClient = useQueryClient();
  const config = typeConfig[service.type] || typeConfig.repair;
  const Icon = config.icon;
  const hdBadge = HD_CONFIDENCE[service.heavyDutyConfidence];

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  const handleReviewAdded = () => {
    queryClient.invalidateQueries({ queryKey: ['service-reviews'] });
    toast.success('Thank you for your review!');
  };

  return (
    <>
      <motion.div whileTap={{ scale: 0.98 }} onClick={onClick}>
        <Card className={`p-4 cursor-pointer transition-all ${
          isSelected
            ? 'bg-white/10 border-orange-500/50'
            : 'bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/20'
        }`}>
          <div className="flex items-start gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
              config.color.split(' ')[0]
            }`}>
              <Icon className={`w-6 h-6 ${config.color.split(' ')[1]}`} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-white truncate">{service.name}</h3>
                <Badge variant="outline" className={`${config.color} shrink-0 text-xs`}>
                  {config.label}
                </Badge>
              </div>

              {/* Issue match + HD confidence badges */}
              {showIssueMatch && (service.issueMatchScore > 0 || hdBadge) && (
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  {service.issueMatchScore >= 20 && (
                    <Badge variant="outline" className="bg-orange-500/15 text-orange-400 border-orange-500/30 text-[10px]">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Matches your issue
                    </Badge>
                  )}
                  {hdBadge && (
                    <Badge variant="outline" className={`${hdBadge.color} text-[10px]`}>
                      <Shield className="w-3 h-3 mr-1" />
                      {hdBadge.label}
                    </Badge>
                  )}
                  {service.mobileAvailable && (
                    <Badge variant="outline" className="bg-green-500/15 text-green-400 border-green-500/30 text-[10px]">
                      Mobile Available
                    </Badge>
                  )}
                </div>
              )}

              {/* Issue match reasons */}
              {showIssueMatch && service.issueMatchReasons?.length > 0 && (
                <p className="text-[11px] text-white/40 mt-1">
                  {service.issueMatchReasons.slice(0, 3).join(' · ')}
                </p>
              )}

              <div className="flex items-center gap-3 mt-1.5">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-medium text-white">
                    {avgRating || service.rating}
                  </span>
                  <span className="text-xs text-white/40">
                    ({reviews.length || service.reviewsCount || service.reviews || 0})
                  </span>
                </div>
                {service.distanceMiles != null && (
                  <span className="text-sm text-white/60">{service.distanceMiles} mi</span>
                )}
                {!service.distanceMiles && service.distance && (
                  <span className="text-sm text-white/60">{service.distance} mi</span>
                )}
                {service.is24Hours && (
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                    <Clock className="w-3 h-3 mr-1" /> 24/7
                  </Badge>
                )}
                {service.isOpenNow && !service.is24Hours && (
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                    Open Now
                  </Badge>
                )}
              </div>

              <p className="text-sm text-white/50 mt-1 truncate flex items-center gap-1">
                <MapPin className="w-3 h-3 shrink-0" />
                {service.address}
              </p>

              {service.hoursText && !service.is24Hours && (
                <p className="text-xs text-white/40 mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {service.hoursText}
                </p>
              )}
              {!service.hoursText && service.hours && !service.is24Hours && (
                <p className="text-xs text-white/40 mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {service.hours}
                </p>
              )}

              {service.specialties?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {service.specialties.slice(0, 4).map((spec, i) => (
                    <Badge key={i} variant="secondary" className="bg-white/5 text-white/60 text-xs border-0">
                      {spec}
                    </Badge>
                  ))}
                </div>
              )}

              {reviews.length > 0 && (
                <div className="pt-2 mt-2 border-t border-white/10">
                  <div className="text-xs text-white/60 italic line-clamp-2">
                    &ldquo;{reviews[0].comment || 'Recommended!'}&rdquo;
                  </div>
                  <div className="text-xs text-white/40 mt-1">
                    — {reviews[0].created_by?.split('@')[0]}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 mt-3">
                {service.phone && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => { e.stopPropagation(); window.open(`tel:${service.phone}`); }}
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
                    window.open(`https://www.google.com/maps/dir/?api=1&destination=${service.lat},${service.lng}`);
                  }}
                  className="h-8 border-white/20 hover:bg-white/10"
                >
                  <Navigation className="w-3 h-3 mr-1" /> Directions
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => { e.stopPropagation(); setShowReviewDialog(true); }}
                  className="h-8 border-orange-500/30 hover:bg-orange-500/10 text-orange-400"
                >
                  <MessageSquare className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      <ReviewDialog
        open={showReviewDialog}
        onClose={() => setShowReviewDialog(false)}
        service={service}
        onReviewSubmitted={handleReviewAdded}
      />
    </>
  );
}
