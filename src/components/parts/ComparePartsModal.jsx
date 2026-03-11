import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  Wrench, 
  Package,
  ShoppingCart,
  ExternalLink,
  AlertCircle,
  Info,
  ShieldCheck,
  AlertTriangle,
  Car
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { VENDOR_INFO } from '@/services/vendorService';

const difficultyColors = {
  easy: 'bg-green-500/20 text-green-400 border-green-500/30',
  moderate: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  difficult: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  professional: 'bg-red-500/20 text-red-400 border-red-500/30'
};

const importanceColors = {
  required: 'border-red-500/30 text-red-400',
  recommended: 'border-orange-500/30 text-orange-400',
  optional: 'border-white/20 text-white/60'
};

const tierBadgeColors = {
  1: 'bg-green-500/20 text-green-400 border-green-500/30',
  2: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  3: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  4: 'bg-white/10 text-white/60 border-white/20',
};

export default function ComparePartsModal({ parts, open, onClose }) {
  if (!parts || parts.length === 0) return null;

  // Detect whether comparing vendor listings or AI recommendations
  const isVendorCompare = parts.some(p => p.vendor && p.itemUrl);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[90vh] bg-[#1a1a1a] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            Compare {isVendorCompare ? 'Listings' : 'Parts'} ({parts.length})
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-120px)]">
          <div className="space-y-6">
            {/* ─── BASIC INFO ─── */}
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${parts.length}, 1fr)` }}>
              {parts.map((part, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-white/5 border border-white/10">
                  {part.imageUrl && (
                    <img src={part.imageUrl} alt="" className="w-full h-24 object-cover rounded-lg mb-3 bg-white/10" />
                  )}
                  <h3 className="font-bold text-lg text-white mb-2 line-clamp-2">{part.name || part.title}</h3>
                  {(part.part_number || part.partNumber) && (
                    <p className="text-xs text-white/50 font-mono mb-3">{part.part_number || part.partNumber}</p>
                  )}
                  
                  <div className="space-y-2">
                    {part.vendor && (
                      <Badge variant="outline" className="border-blue-500/30 text-blue-400 w-full justify-center">
                        {part.vendor}
                      </Badge>
                    )}
                    {part.category && (
                      <Badge variant="outline" className="border-orange-500/30 text-orange-400 w-full justify-center capitalize">
                        {part.category}
                      </Badge>
                    )}
                    {part.condition && part.condition !== 'Unknown' && (
                      <Badge variant="outline" className="border-white/20 text-white/70 w-full justify-center">
                        {part.condition}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* ─── VENDOR: Trust Tier & Fitment ─── */}
            {isVendorCompare && (
              <div>
                <h3 className="text-sm font-semibold text-white/90 mb-3 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-green-400" />
                  Trust & Fitment
                </h3>
                <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${parts.length}, 1fr)` }}>
                  {parts.map((part, idx) => (
                    <div key={idx} className="p-4 rounded-lg bg-white/5 border border-white/10 text-center space-y-2">
                      {part.sourceTier && (
                        <Badge variant="outline" className={`${tierBadgeColors[part.sourceTier] || tierBadgeColors[4]} w-full justify-center`}>
                          {part.sourceTier === 1 && <ShieldCheck className="w-3 h-3 mr-1" />}
                          Tier {part.sourceTier}
                        </Badge>
                      )}
                      {part.isOEM && (
                        <Badge variant="outline" className="border-green-500/30 text-green-400 w-full justify-center">OEM</Badge>
                      )}
                      {part.fitmentConfidence && part.fitmentConfidence !== 'unknown' && (
                        <p className={`text-xs ${part.fitmentConfidence === 'exact' || part.fitmentConfidence === 'high' ? 'text-green-400' : 'text-yellow-400'}`}>
                          Fitment: {part.fitmentConfidence}
                        </p>
                      )}
                      {part.counterfeitRisk === 'high' && (
                        <p className="text-xs text-red-400 flex items-center justify-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Counterfeit risk
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ─── VENDOR: Price Comparison ─── */}
            {isVendorCompare && (
              <div>
                <h3 className="text-sm font-semibold text-white/90 mb-3 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-orange-400" />
                  Price
                </h3>
                <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${parts.length}, 1fr)` }}>
                  {parts.map((part, idx) => (
                    <div key={idx} className="p-4 rounded-lg bg-white/5 border border-white/10 text-center">
                      <p className="text-2xl font-bold text-orange-400">
                        {part.price > 0 ? `$${part.price.toFixed(2)}` : 'See listing'}
                      </p>
                      {part.shipping && (
                        <p className="text-xs text-white/50 mt-1">Shipping: {part.shipping}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ─── VENDOR: Seller Info ─── */}
            {isVendorCompare && (
              <div>
                <h3 className="text-sm font-semibold text-white/90 mb-3 flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-white/60" />
                  Seller
                </h3>
                <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${parts.length}, 1fr)` }}>
                  {parts.map((part, idx) => (
                    <div key={idx} className="p-4 rounded-lg bg-white/5 border border-white/10 text-center space-y-2">
                      <p className="text-sm text-white/80">{part.sellerName || part.vendor || '—'}</p>
                      {part.sellerRating && (
                        <p className="text-xs text-white/50">Rating: {part.sellerRating}</p>
                      )}
                      {part.listingType && (
                        <Badge variant="outline" className="border-white/20 text-white/60 text-xs">
                          {part.listingType}
                        </Badge>
                      )}
                      {part.itemUrl && (
                        <a
                          href={part.itemUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 mt-2"
                        >
                          View listing <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ─── RECOMMENDATION: Importance ─── */}
            {!isVendorCompare && (
              <div>
                <h3 className="text-sm font-semibold text-white/90 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-orange-400" />
                  Importance
                </h3>
                <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${parts.length}, 1fr)` }}>
                  {parts.map((part, idx) => (
                    <div key={idx} className="p-4 rounded-lg bg-white/5 border border-white/10 text-center">
                      <Badge 
                        variant="outline" 
                        className={`${importanceColors[part.importance] || 'border-white/20 text-white/60'} w-full justify-center capitalize`}
                      >
                        {part.importance || 'N/A'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ─── RECOMMENDATION: Why Needed ─── */}
            {!isVendorCompare && (
              <div>
                <h3 className="text-sm font-semibold text-white/90 mb-3 flex items-center gap-2">
                  <Info className="w-4 h-4 text-orange-400" />
                  Why Needed
                </h3>
                <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${parts.length}, 1fr)` }}>
                  {parts.map((part, idx) => (
                    <div key={idx} className="p-4 rounded-lg bg-white/5 border border-white/10">
                      <p className="text-sm text-white/70">{part.why_needed || 'No details available'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ─── Installation Difficulty (recommendations only) ─── */}
            {!isVendorCompare && (
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
            )}

            {/* ─── Compatibility (recommendations only) ─── */}
            {!isVendorCompare && (
              <div>
                <h3 className="text-sm font-semibold text-white/90 mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4 text-white/60" />
                  Compatibility
                </h3>
                <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${parts.length}, 1fr)` }}>
                  {parts.map((part, idx) => (
                    <div key={idx} className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-2">
                      {part.compatible_makes?.length > 0 ? (
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
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ─── Related Error Codes (recommendations only) ─── */}
            {!isVendorCompare && (
              <div>
                <h3 className="text-sm font-semibold text-white/90 mb-3">Related Error Codes</h3>
                <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${parts.length}, 1fr)` }}>
                  {parts.map((part, idx) => (
                    <div key={idx} className="p-4 rounded-lg bg-white/5 border border-white/10">
                      {part.related_error_codes?.length > 0 ? (
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
            )}


          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
