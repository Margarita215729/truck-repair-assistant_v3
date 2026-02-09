import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, Phone, Navigation, Clock, MapPin, Wrench, ParkingCircle, Truck, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';
import ReviewDialog from './ReviewDialog';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const typeConfig = {
  repair: {
    icon: Wrench,
    label: 'Repair Shop',
    color: 'bg-orange-500/20 text-orange-400 border-orange-500/30'
  },
  parking: {
    icon: ParkingCircle,
    label: 'Truck Parking',
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
  },
  towing: {
    icon: Truck,
    label: 'Towing Service',
    color: 'bg-red-500/20 text-red-400 border-red-500/30'
  }
};

export default function ServiceCard({ service, isSelected, onClick, reviews = [] }) {
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const queryClient = useQueryClient();
  const config = typeConfig[service.type];
  const Icon = config.icon;

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  const handleReviewAdded = () => {
    queryClient.invalidateQueries({ queryKey: ['service-reviews'] });
    toast.success('Thank you for your review!');
  };

  return (
    <>
      <motion.div
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
      >
        <Card className={`p-4 cursor-pointer transition-all ${
          isSelected 
            ? 'bg-white/10 border-orange-500/50' 
            : 'bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/20'
        }`}>
          <div className="flex items-start gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
              service.type === 'repair' ? 'bg-orange-500/20' :
              service.type === 'parking' ? 'bg-blue-500/20' : 'bg-red-500/20'
            }`}>
              <Icon className={`w-6 h-6 ${
                service.type === 'repair' ? 'text-orange-500' :
                service.type === 'parking' ? 'text-blue-500' : 'text-red-500'
              }`} />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-white truncate">{service.name}</h3>
                <Badge variant="outline" className={`${config.color} shrink-0 text-xs`}>
                  {config.label}
                </Badge>
              </div>
              
              <div className="flex items-center gap-3 mt-1">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-medium text-white">
                    {avgRating || service.rating}
                  </span>
                  <span className="text-xs text-white/40">
                    ({reviews.length || service.reviews})
                  </span>
                </div>
                {service.distance && (
                  <span className="text-sm text-white/60">{service.distance} mi</span>
                )}
                {service.is24Hours && (
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                    <Clock className="w-3 h-3 mr-1" />
                    24/7
                  </Badge>
                )}
              </div>
              
              <p className="text-sm text-white/50 mt-1 truncate flex items-center gap-1">
                <MapPin className="w-3 h-3 shrink-0" />
                {service.address}
              </p>

              {service.hours && !service.is24Hours && (
                <p className="text-xs text-white/40 mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {service.hours}
                </p>
              )}

              {service.specialties && service.specialties.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {service.specialties.slice(0, 3).map((spec, i) => (
                    <Badge key={i} variant="secondary" className="bg-white/5 text-white/60 text-xs border-0">
                      {spec}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Reviews Preview */}
              {reviews.length > 0 && (
                <div className="pt-2 mt-2 border-t border-white/10">
                  <div className="text-xs text-white/60 italic line-clamp-2">
                    "{reviews[0].comment || 'Recommended!'}"
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
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(`tel:${service.phone}`);
                    }}
                    className="h-8 border-white/20 hover:bg-white/10"
                  >
                    <Phone className="w-3 h-3 mr-1" />
                    Call
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
                  <Navigation className="w-3 h-3 mr-1" />
                  Directions
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowReviewDialog(true);
                  }}
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
