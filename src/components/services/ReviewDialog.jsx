import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Star, ThumbsUp, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { entities } from '@/services/entityService';
import { toast } from 'sonner';

const SERVICE_TYPES = [
  'Engine Repair',
  'Electrical',
  'Tires',
  'Brakes',
  'Transmission',
  'Diagnostic',
];

export default function ReviewDialog({ open, onClose, service, onReviewSubmitted }) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [visitDate, setVisitDate] = useState('');
  const [selectedServices, setSelectedServices] = useState([]);
  const [wouldRecommend, setWouldRecommend] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    setIsSubmitting(true);
    try {
      await entities.ServiceReview.create({
        service_name: service.name,
        service_address: service.address,
        rating,
        comment,
        service_types: selectedServices,
        visit_date: visitDate || null,
        would_recommend: wouldRecommend,
      });

      toast.success('Review submitted!');
      onReviewSubmitted?.();
      handleClose();
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setRating(0);
    setHoveredRating(0);
    setComment('');
    setVisitDate('');
    setSelectedServices([]);
    setWouldRecommend(true);
    onClose();
  };

  const toggleService = (service) => {
    setSelectedServices(prev =>
      prev.includes(service)
        ? prev.filter(s => s !== service)
        : [...prev, service]
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-[#141414] border-white/10 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Review for {service?.name}
          </DialogTitle>
          <p className="text-sm text-white/50">{service?.address}</p>
        </DialogHeader>

        <div className="space-y-5 pt-4">
          {/* Rating */}
          <div className="space-y-2">
            <label className="text-sm text-white/60">Your rating *</label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <motion.button
                  key={star}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => setRating(star)}
                >
                  <Star
                    className={`w-10 h-10 transition-colors ${
                      star <= (hoveredRating || rating)
                        ? 'fill-yellow-500 text-yellow-500'
                        : 'text-white/20'
                    }`}
                  />
                </motion.button>
              ))}
              {rating > 0 && (
                <span className="ml-2 text-sm text-white/60">
                  {rating === 5 ? 'Excellent!' : rating === 4 ? 'Good' : rating === 3 ? 'Average' : rating === 2 ? 'Poor' : 'Terrible'}
                </span>
              )}
            </div>
          </div>

          {/* Services Received */}
          <div className="space-y-2">
            <label className="text-sm text-white/60">Services received</label>
            <div className="flex flex-wrap gap-2">
              {SERVICE_TYPES.map((service) => (
                <motion.button
                  key={service}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => toggleService(service)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selectedServices.includes(service)
                      ? 'bg-orange-500 text-white'
                      : 'bg-white/5 text-white/60 hover:bg-white/10'
                  }`}
                >
                  {service}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <label className="text-sm text-white/60">Comment</label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience..."
              className="bg-white/5 border-white/10 text-white min-h-[100px]"
            />
          </div>

          {/* Visit Date */}
          <div className="space-y-2">
            <label className="text-sm text-white/60">Visit date</label>
            <Input
              type="date"
              value={visitDate}
              onChange={(e) => setVisitDate(e.target.value)}
              className="bg-white/5 border-white/10 text-white"
            />
          </div>

          {/* Recommend */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setWouldRecommend(!wouldRecommend)}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
              wouldRecommend
                ? 'bg-green-500/20 border-2 border-green-500 text-green-400'
                : 'bg-white/5 border-2 border-white/10 text-white/60'
            }`}
          >
            <ThumbsUp className="w-5 h-5" />
            {wouldRecommend ? 'I recommend this service' : 'Click to recommend'}
          </motion.button>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={rating === 0 || isSubmitting}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Review'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
