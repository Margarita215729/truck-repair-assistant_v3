import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  DollarSign, 
  Wrench, 
  Clock, 
  Star,
  CheckCircle,
  Package,
  ShoppingCart,
  ExternalLink
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const difficultyColors = {
  easy: 'bg-green-500/20 text-green-400 border-green-500/30',
  moderate: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  difficult: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  professional: 'bg-red-500/20 text-red-400 border-red-500/30'
};

export default function ComparePartsModal({ parts, open, onClose }) {
  if (!parts || parts.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[90vh] bg-[#1a1a1a] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Compare Parts ({parts.length})</DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-120px)]">
          <div className="space-y-6">
            {/* Basic Info Comparison */}
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${parts.length}, 1fr)` }}>
              {parts.map((part, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <h3 className="font-bold text-lg text-white mb-2 line-clamp-2">{part.name}</h3>
                  <p className="text-xs text-white/50 font-mono mb-3">{part.part_number}</p>
                  
                  <div className="space-y-2">
                    <Badge variant="outline" className="border-orange-500/30 text-orange-400 w-full justify-center">
                      {part.part_type || 'N/A'}
                    </Badge>
                    {part.manufacturer && (
                      <Badge variant="outline" className="border-white/20 text-white/70 w-full justify-center">
                        {part.manufacturer}
                      </Badge>
                    )}
                  </div>

                  {part.average_rating > 0 && (
                    <div className="flex items-center justify-center gap-1 mt-3 pt-3 border-t border-white/10">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-semibold text-white">{part.average_rating.toFixed(1)}</span>
                      <span className="text-xs text-white/50">({part.review_count})</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Price Comparison */}
            <div>
              <h3 className="text-sm font-semibold text-white/90 mb-3 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-orange-400" />
                Price Range
              </h3>
              <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${parts.length}, 1fr)` }}>
                {parts.map((part, idx) => (
                  <div key={idx} className="p-4 rounded-lg bg-white/5 border border-white/10 text-center">
                    <p className="text-2xl font-bold text-orange-400">
                      {part.price_range 
                        ? `$${part.price_range.min} - $${part.price_range.max}`
                        : 'N/A'}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Installation Difficulty */}
            <div>
              <h3 className="text-sm font-semibold text-white/90 mb-3 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-white/60" />
                Installation
              </h3>
              <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${parts.length}, 1fr)` }}>
                {parts.map((part, idx) => (
                  <div key={idx} className="p-4 rounded-lg bg-white/5 border border-white/10 text-center">
                    <Badge 
                      variant="outline" 
                      className={`${difficultyColors[part.installation_difficulty] || 'border-white/20 text-white/70'} w-full justify-center capitalize`}
                    >
                      {part.installation_difficulty || 'N/A'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Compatibility */}
            <div>
              <h3 className="text-sm font-semibold text-white/90 mb-3 flex items-center gap-2">
                <Package className="w-4 h-4 text-white/60" />
                Compatibility
              </h3>
              <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${parts.length}, 1fr)` }}>
                {parts.map((part, idx) => (
                  <div key={idx} className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-2">
                    {part.compatible_makes && part.compatible_makes.length > 0 ? (
                      <div className="flex flex-wrap gap-1 justify-center">
                        {part.compatible_makes.slice(0, 3).map((make, i) => (
                          <Badge key={i} variant="outline" className="border-white/20 text-white/70 text-xs">
                            {make}
                          </Badge>
                        ))}
                        {part.compatible_makes.length > 3 && (
                          <Badge variant="outline" className="border-white/20 text-white/70 text-xs">
                            +{part.compatible_makes.length - 3}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-white/50 text-center">No data</p>
                    )}
                    {part.year_range && (
                      <p className="text-xs text-white/60 text-center">
                        {part.year_range.from} - {part.year_range.to || 'Present'}
                      </p>
                    )}
                    {part.average_lifespan && (
                      <p className="text-xs text-white/60 text-center flex items-center justify-center gap-1">
                        <Clock className="w-3 h-3" />
                        {part.average_lifespan}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Where to Buy - Vendor Comparison */}
            <div>
              <h3 className="text-sm font-semibold text-white/90 mb-3 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-orange-400" />
                Where to Buy
              </h3>
              <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${parts.length}, 1fr)` }}>
                {parts.map((part, idx) => (
                  <div key={idx} className="p-4 rounded-lg bg-white/5 border border-white/10">
                    {part.vendor_links && part.vendor_links.length > 0 ? (
                      <div className="space-y-2">
                        {part.vendor_links.map((vendor, i) => (
                          <a
                            key={i}
                            href={vendor.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-2 rounded bg-white/5 hover:bg-white/10 transition-all text-xs"
                          >
                            <span className="text-white/80 truncate">{vendor.vendor}</span>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {vendor.price && (
                                <span className="font-semibold text-orange-400">${vendor.price}</span>
                              )}
                              <ExternalLink className="w-3 h-3 text-white/40" />
                            </div>
                          </a>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-white/50 text-center">No vendors listed</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* User Reviews Summary */}
            <div>
              <h3 className="text-sm font-semibold text-white/90 mb-3 flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-400" />
                Reviews
              </h3>
              <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${parts.length}, 1fr)` }}>
                {parts.map((part, idx) => (
                  <div key={idx} className="p-4 rounded-lg bg-white/5 border border-white/10">
                    {part.user_reviews && part.user_reviews.length > 0 ? (
                      <div className="space-y-3">
                        <div className="text-center pb-2 border-b border-white/10">
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                            <span className="text-xl font-bold text-white">
                              {part.average_rating?.toFixed(1) || 'N/A'}
                            </span>
                          </div>
                          <p className="text-xs text-white/50">{part.review_count || 0} reviews</p>
                        </div>
                        
                        {part.user_reviews.slice(0, 2).map((review, i) => (
                          <div key={i} className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-white/80">{review.user_name}</span>
                              <div className="flex items-center gap-1">
                                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                <span className="text-xs text-white/70">{review.rating}</span>
                              </div>
                            </div>
                            <p className="text-xs text-white/60 line-clamp-2">{review.review_text}</p>
                            {review.verified_purchase && (
                              <div className="flex items-center gap-1">
                                <CheckCircle className="w-3 h-3 text-green-400" />
                                <span className="text-[10px] text-green-400">Verified Purchase</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-white/50 text-center">No reviews yet</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Related Error Codes */}
            <div>
              <h3 className="text-sm font-semibold text-white/90 mb-3">Related Error Codes</h3>
              <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${parts.length}, 1fr)` }}>
                {parts.map((part, idx) => (
                  <div key={idx} className="p-4 rounded-lg bg-white/5 border border-white/10">
                    {part.related_error_codes && part.related_error_codes.length > 0 ? (
                      <div className="flex flex-wrap gap-1 justify-center">
                        {part.related_error_codes.map((code, i) => (
                          <Badge key={i} variant="outline" className="border-red-500/30 text-red-400 font-mono text-xs">
                            {code}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-white/50 text-center">None listed</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
