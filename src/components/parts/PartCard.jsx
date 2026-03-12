import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, DollarSign, Wrench, ExternalLink, Search, Loader2, Trash2, ShoppingCart, ShieldCheck, AlertTriangle, Car, Eye } from 'lucide-react';
import { motion } from 'framer-motion';
import { Checkbox } from '@/components/ui/checkbox';
import { searchVendorsForPart, aggregateListings, SOURCE_TIER_LABELS } from '@/services/vendorService';
import { toast } from 'sonner';

const categoryIcons = {
  engine: '🔧', transmission: '⚙️', brakes: '🛑', electrical: '⚡',
  exhaust: '💨', fuel_system: '⛽', cooling: '❄️', suspension: '🔩',
  drivetrain: '🔄', body: '🚛', filters: '🔍', sensors: '📡', other: '📦'
};

const difficultyColors = {
  easy: 'bg-green-500/20 text-green-400 border-green-500/30',
  moderate: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  difficult: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  professional: 'bg-red-500/20 text-red-400 border-red-500/30'
};

const importanceColors = {
  required: 'bg-red-500/20 text-red-400 border-red-500/30',
  recommended: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  optional: 'bg-white/10 text-white/60 border-white/20',
};

const urgencyColors = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low: 'bg-white/10 text-white/60 border-white/20',
};

const driveabilityColors = {
  do_not_drive: 'bg-red-600/20 text-red-400 border-red-600/30',
  limp_mode: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  reduced_performance: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  safe_to_drive: 'bg-green-500/20 text-green-400 border-green-500/30',
};

const tierBadgeColors = {
  1: 'bg-green-500/20 text-green-400 border-green-500/30',
  2: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  3: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  4: 'bg-white/10 text-white/60 border-white/20',
};

/**
 * PartCard — dual-mode card component.
 * variant="recommended" — shows AI recommendation metadata + "Find Prices" button
 * variant="vendor" — shows a live vendor listing with price, image, vendor link
 */
export default function PartCard({ part, variant = 'recommended', onClick, onDelete, compareMode, isSelected }) {
  const [vendorPrices, setVendorPrices] = useState(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceError, setPriceError] = useState(null);

  const handleFindPrices = async (e) => {
    e.stopPropagation();
    setPriceLoading(true);
    setPriceError(null);
    try {
      const results = await searchVendorsForPart(part);
      setVendorPrices(results);
    } catch (err) {
      setPriceError(err.message);
      toast.error(err.message || 'Vendor search failed');
    }
    setPriceLoading(false);
  };

  // ═══ VENDOR LISTING CARD ═══
  if (variant === 'vendor') {
    return (
      <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
        <Card
          onClick={onClick}
          className={`bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer ${isSelected ? 'ring-2 ring-orange-500 bg-orange-500/10' : ''}`}
        >
          <CardContent className="p-4">
            {compareMode && (
              <div className="flex justify-end mb-2">
                <Checkbox checked={isSelected} className="border-white/20" />
              </div>
            )}

            {/* Image + Title */}
            <div className="flex items-start gap-3 mb-3">
              {part.imageUrl ? (
                <img src={part.imageUrl} alt={part.title} className="w-16 h-16 rounded-lg object-cover bg-white/10 flex-shrink-0" />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                  <ShoppingCart className="w-6 h-6 text-white/30" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-white mb-1 line-clamp-2 text-sm">{part.title}</h3>
                {part.partNumber && (
                  <p className="text-xs text-white/50 font-mono">{part.partNumber}</p>
                )}
              </div>
            </div>

            {/* Vendor + Condition + Trust Tier */}
            <div className="flex flex-wrap gap-2 mb-3">
              {part.sourceTier && (
                <Badge variant="outline" className={`text-xs ${tierBadgeColors[part.sourceTier] || tierBadgeColors[4]}`}>
                  {part.sourceTier === 1 && <ShieldCheck className="w-3 h-3 mr-1" />}
                  T{part.sourceTier}
                </Badge>
              )}
              <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-400">
                {part.vendor}
              </Badge>
              {part.isOEM && (
                <Badge variant="outline" className="text-xs border-green-500/30 text-green-400">OEM</Badge>
              )}
              {part.condition && part.condition !== 'Unknown' && (
                <Badge variant="outline" className="text-xs border-white/20 text-white/70">
                  {part.condition}
                </Badge>
              )}
              {part.listingType && (
                <Badge variant="outline" className="text-xs border-white/20 text-white/60">
                  {part.listingType}
                </Badge>
              )}
            </div>

            {/* Fitment & counterfeit risk */}
            {(part.fitmentConfidence || part.counterfeitRisk) && (
              <div className="flex flex-wrap gap-2 mb-3 text-xs">
                {part.fitmentConfidence && part.fitmentConfidence !== 'unknown' && (
                  <span className={`${part.fitmentConfidence === 'exact' ? 'text-green-400' : part.fitmentConfidence === 'high' ? 'text-blue-400' : 'text-yellow-400'}`}>
                    Fit: {part.fitmentConfidence}
                  </span>
                )}
                {part.counterfeitRisk === 'high' && (
                  <span className="text-red-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Counterfeit risk
                  </span>
                )}
              </div>
            )}

            {/* Shipping & Seller */}
            {(part.shipping || part.sellerRating) && (
              <div className="text-xs text-white/50 mb-3">
                {part.shipping && <span>Shipping: {part.shipping}</span>}
                {part.shipping && part.sellerRating && <span> · </span>}
                {part.sellerRating && <span>Seller: {part.sellerRating}</span>}
              </div>
            )}

            {/* Footer: Price + Link */}
            <div className="flex items-center justify-between pt-3 border-t border-white/10">
              <div className="text-lg font-bold text-orange-400">
                {part.price > 0 ? `$${part.price.toFixed(2)}` : 'See listing'}
              </div>
              <a
                href={part.itemUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
              >
                View on {part.vendor}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // ═══ RECOMMENDED PART CARD ═══
  const categoryIcon = categoryIcons[part.category] || '📦';

  return (
    <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
      <Card
        onClick={onClick}
        className={`bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer ${isSelected ? 'ring-2 ring-orange-500 bg-orange-500/10' : ''}`}
      >
        <CardContent className="p-4">
          {compareMode && (
            <div className="flex justify-end mb-2">
              <Checkbox checked={isSelected} className="border-white/20" />
            </div>
          )}

          {/* Header */}
          <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500/20 to-orange-600/20 flex items-center justify-center text-2xl flex-shrink-0">
              {categoryIcon}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-white mb-1 line-clamp-1">{part.name}</h3>
              {part.part_number && (
                <p className="text-xs text-white/50 font-mono">{part.part_number}</p>
              )}
            </div>
            {onDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="p-1.5 rounded-md hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Description / why_needed */}
          {(part.description || part.why_needed) && (
            <p className="text-sm text-white/70 mb-3 line-clamp-2">{part.description || part.why_needed}</p>
          )}

          {/* OEM part number */}
          {part.oem_part_number && (
            <div className="text-xs text-white/50 mb-2 font-mono">
              OEM: {part.oem_part_number}
              {part.alt_part_numbers?.length > 0 && (
                <span className="text-white/30"> · Alt: {part.alt_part_numbers.slice(0, 2).join(', ')}</span>
              )}
            </div>
          )}

          {/* Urgency / Driveability / Action Type badges */}
          <div className="flex flex-wrap gap-2 mb-3">
            {part.urgency && part.urgency !== 'low' && (
              <Badge variant="outline" className={`text-xs ${urgencyColors[part.urgency] || ''}`}>
                {part.urgency === 'critical' && <AlertTriangle className="w-3 h-3 mr-1" />}
                {part.urgency}
              </Badge>
            )}
            {part.driveability && part.driveability !== 'safe_to_drive' && (
              <Badge variant="outline" className={`text-xs ${driveabilityColors[part.driveability] || ''}`}>
                <Car className="w-3 h-3 mr-1" />
                {part.driveability.replace(/_/g, ' ')}
              </Badge>
            )}
            {part.action_type && (
              <Badge variant="outline" className="text-xs border-white/20 text-white/60">
                {part.action_type === 'inspect_first' && <Eye className="w-3 h-3 mr-1" />}
                {part.action_type.replace(/_/g, ' ')}
              </Badge>
            )}
          </div>

          {/* Difficulty + Importance badges */}
          <div className="flex flex-wrap gap-2 mb-3">
            {part.installation_difficulty && (
              <Badge variant="outline" className={`text-xs ${difficultyColors[part.installation_difficulty] || 'border-white/20 text-white/60'}`}>
                <Wrench className="w-3 h-3 mr-1" />{part.installation_difficulty}
              </Badge>
            )}
            {part.importance && part.importance !== 'recommended' && (
              <Badge variant="outline" className={`text-xs ${importanceColors[part.importance] || ''}`}>
                {part.importance}
              </Badge>
            )}
            {part.roadside_possible && (
              <Badge variant="outline" className="text-xs border-green-500/30 text-green-400">Roadside OK</Badge>
            )}
            {part.shop_required && (
              <Badge variant="outline" className="text-xs border-yellow-500/30 text-yellow-400">Shop Required</Badge>
            )}
            {part.programming_required && (
              <Badge variant="outline" className="text-xs border-purple-500/30 text-purple-400">Needs Programming</Badge>
            )}
          </div>

          {/* Compatible trucks + error codes */}
          {part.compatible_makes?.length > 0 && (
            <div className="text-xs text-white/50 mb-2">
              🚛 {part.compatible_makes.slice(0, 3).join(', ')}
            </div>
          )}
          {part.related_error_codes?.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {part.related_error_codes.slice(0, 3).map((code, i) => (
                <Badge key={i} variant="outline" className="border-red-500/30 text-red-400 font-mono text-[10px] h-5">{code}</Badge>
              ))}
            </div>
          )}

          {/* Paired parts preview */}
          {part.pair_with_parts?.length > 0 && (
            <div className="text-xs text-white/50 mb-3">
              <span className="text-white/40">Also replace: </span>
              {part.pair_with_parts.slice(0, 2).join(', ')}
              {part.bundle_label && <span className="text-orange-400 ml-1">({part.bundle_label})</span>}
            </div>
          )}

          {/* Find Prices button */}
          <div className="pt-3 border-t border-white/10">
            {!vendorPrices && !priceLoading && !priceError && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleFindPrices}
                className="w-full border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
              >
                <Search className="w-3.5 h-3.5 mr-2" />
                Search External Sources
              </Button>
            )}

            {priceLoading && (
              <div className="flex items-center justify-center py-2 gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-orange-400" />
                <span className="text-xs text-white/50">Searching vendors...</span>
              </div>
            )}

            {priceError && !priceLoading && (
              <div className="space-y-2">
                <p className="text-xs text-red-400">Search failed: {priceError}</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleFindPrices}
                  className="w-full border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
                >
                  <Search className="w-3.5 h-3.5 mr-2" />
                  Retry
                </Button>
              </div>
            )}

            {vendorPrices && !priceLoading && (
              <div className="space-y-2">
                {aggregateListings(vendorPrices).slice(0, 3).map((listing, i) => (
                  <a
                    key={i}
                    href={listing.itemUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 transition text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-white/50">{listing.vendor}</span>
                      <span className="text-white/70 line-clamp-1 max-w-[140px]">{listing.title}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="font-semibold text-orange-400">
                        {listing.price > 0 ? `$${listing.price.toFixed(2)}` : 'See listing'}
                      </span>
                      <ExternalLink className="w-3 h-3 text-white/40" />
                    </div>
                  </a>
                ))}

              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
