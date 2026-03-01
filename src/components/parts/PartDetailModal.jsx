import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  DollarSign, 
  Wrench, 
  ExternalLink, 
  AlertCircle,
  ShoppingCart,
  Info,
  Truck,
  Search,
  Loader2,
  Globe,
  Package
} from 'lucide-react';
import { searchVendorsForPart, searchVendors, getSearchUrls, aggregateListings, VENDOR_INFO } from '@/services/vendorService';

const categoryIcons = {
  engine: '🔧', transmission: '⚙️', brakes: '🛑', electrical: '⚡',
  exhaust: '💨', fuel_system: '⛽', cooling: '❄️', suspension: '🔩',
  drivetrain: '🔄', body: '🚛', filters: '🔍', sensors: '📡', other: '📦'
};

const difficultyInfo = {
  easy: { color: 'text-green-400', desc: 'Can be done with basic tools' },
  moderate: { color: 'text-yellow-400', desc: 'Requires some mechanical experience' },
  difficult: { color: 'text-orange-400', desc: 'Advanced mechanical skills needed' },
  professional: { color: 'text-red-400', desc: 'Professional installation recommended' }
};

const importanceConfig = {
  required: { color: 'text-red-400', border: 'border-red-500/30', label: 'Required' },
  recommended: { color: 'text-orange-400', border: 'border-orange-500/30', label: 'Recommended' },
  optional: { color: 'text-white/60', border: 'border-white/20', label: 'Optional' }
};

export default function PartDetailModal({ part, open, onClose }) {
  const [vendorResults, setVendorResults] = useState(null);
  const [vendorLoading, setVendorLoading] = useState(false);

  if (!part) return null;

  // Determine if this is a vendor listing or a recommendation
  const isVendorListing = !!part.vendor && !!part.itemUrl;
  
  const categoryIcon = categoryIcons[part.category] || '📦';
  const diffInfo = difficultyInfo[part.installation_difficulty] || null;
  const impInfo = importanceConfig[part.importance] || null;

  // Generated search URLs
  const searchUrls = getSearchUrls(
    part.part_number || part.partNumber || '',
    part.name || part.title || ''
  );

  const handleSearchVendors = async () => {
    setVendorLoading(true);
    try {
      if (isVendorListing) {
        const results = await searchVendors(part.title, { partNumber: part.partNumber });
        setVendorResults(results);
      } else {
        const results = await searchVendorsForPart(part);
        setVendorResults(results);
      }
    } catch {
      setVendorResults({ fleetpride: [], truckpro: [], searchUrls });
    }
    setVendorLoading(false);
  };

  const allListings = vendorResults ? aggregateListings(vendorResults) : [];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { onClose(); setVendorResults(null); } }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-[#1a1a1a] border-white/10 text-white">
        <DialogHeader>
          <div className="flex items-start gap-4">
            {isVendorListing && part.imageUrl ? (
              <img src={part.imageUrl} alt={part.title} className="w-20 h-20 rounded-xl object-cover bg-white/10 flex-shrink-0" />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-600/20 flex items-center justify-center text-4xl flex-shrink-0">
                {categoryIcon}
              </div>
            )}
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold text-white mb-2">
                {part.name || part.title}
              </DialogTitle>
              {(part.part_number || part.partNumber) && (
                <p className="text-sm text-white/50 font-mono mb-2">{part.part_number || part.partNumber}</p>
              )}
              <div className="flex flex-wrap gap-2">
                {isVendorListing && (
                  <Badge variant="outline" className="border-blue-500/30 text-blue-400">{part.vendor}</Badge>
                )}
                {part.condition && part.condition !== 'Unknown' && (
                  <Badge variant="outline" className="border-white/20 text-white/70">{part.condition}</Badge>
                )}
                {impInfo && (
                  <Badge variant="outline" className={`${impInfo.border} ${impInfo.color}`}>{impInfo.label}</Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-6">

          {/* ─── VENDOR LISTING: Price + Buy ─── */}
          {isVendorListing && (
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-orange-400" />
                  <span className="text-sm text-white/60">Price</span>
                </div>
                <p className="text-2xl font-bold text-orange-400">
                  {part.price > 0 ? `$${part.price.toFixed(2)}` : 'See listing'}
                </p>
                {part.shipping && <p className="text-xs text-white/50 mt-1">Shipping: {part.shipping}</p>}
              </div>
              <div className="p-4 rounded-lg bg-white/5 border border-white/10 flex flex-col justify-center">
                <a
                  href={part.itemUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold transition-colors"
                >
                  <ShoppingCart className="w-4 h-4" />
                  Buy on {part.vendor}
                  <ExternalLink className="w-4 h-4" />
                </a>
                {part.sellerRating && (
                  <p className="text-xs text-white/50 text-center mt-2">Seller rating: {part.sellerRating}</p>
                )}
              </div>
            </div>
          )}

          {/* ─── RECOMMENDATION: Why Needed ─── */}
          {!isVendorListing && part.why_needed && (
            <div className="p-4 rounded-lg bg-orange-500/5 border border-orange-500/20">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-orange-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-semibold text-orange-400 mb-1">Why This Part Is Needed</h3>
                  <p className="text-sm text-white/80">{part.why_needed}</p>
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          {(part.description) && (
            <div>
              <h3 className="text-sm font-semibold text-white/90 mb-2">Description</h3>
              <p className="text-white/70">{part.description}</p>
            </div>
          )}

          {/* Installation info */}
          {diffInfo && (
            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Wrench className="w-4 h-4 text-white/60" />
                <span className="text-sm text-white/60">Installation Difficulty</span>
              </div>
              <p className={`text-lg font-semibold ${diffInfo.color} capitalize`}>{part.installation_difficulty}</p>
              <p className="text-xs text-white/50 mt-1">{diffInfo.desc}</p>
              {part.installation_notes && (
                <p className="text-sm text-white/70 mt-3 pt-3 border-t border-white/10">{part.installation_notes}</p>
              )}
            </div>
          )}

          {/* Truck context */}
          {part.truck_context && (
            <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
              <div className="flex items-center gap-2 mb-1">
                <Truck className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-white/60">Diagnosed For</span>
              </div>
              <p className="text-sm text-white/80">
                {[part.truck_context.year, part.truck_context.make, part.truck_context.model].filter(Boolean).join(' ')}
              </p>
            </div>
          )}

          {/* Related error codes */}
          {part.related_error_codes?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-white/90 mb-3">Related Error Codes</h3>
              <div className="flex flex-wrap gap-2">
                {part.related_error_codes.map((code, i) => (
                  <Badge key={i} variant="outline" className="border-red-500/30 text-red-400 font-mono">{code}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* ─── LIVE VENDOR PRICING ─── */}
          <div className="pt-4 border-t border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white/90 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-orange-400" />
                Live Vendor Pricing
              </h3>
              {!vendorResults && !vendorLoading && (
                <Button
                  size="sm"
                  onClick={handleSearchVendors}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  <Search className="w-3.5 h-3.5 mr-2" />
                  Search Vendors
                </Button>
              )}
            </div>

            {vendorLoading && (
              <div className="flex items-center justify-center py-8 gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-orange-400" />
                <span className="text-sm text-white/50">Searching vendors and dealers...</span>
              </div>
            )}

            {vendorResults && !vendorLoading && (
              <div className="space-y-3">
                {allListings.length > 0 ? (
                  allListings.slice(0, 8).map((listing, i) => (
                    <a
                      key={i}
                      href={listing.itemUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {listing.imageUrl ? (
                          <img src={listing.imageUrl} alt="" className="w-10 h-10 rounded object-cover bg-white/10" />
                        ) : (
                          <div className="w-10 h-10 rounded bg-white/10 flex items-center justify-center">
                            <Package className="w-4 h-4 text-white/30" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white/90 line-clamp-1">{listing.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-blue-400">{listing.vendor}</span>
                            {listing.condition && listing.condition !== 'Unknown' && (
                              <span className="text-xs text-white/40">· {listing.condition}</span>
                            )}
                            {listing.shipping && (
                              <span className="text-xs text-white/40">· {listing.shipping}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                        <span className="text-lg font-bold text-orange-400">
                          {listing.price > 0 ? `$${listing.price.toFixed(2)}` : 'See listing'}
                        </span>
                        <ExternalLink className="w-4 h-4 text-white/40" />
                      </div>
                    </a>
                  ))
                ) : (
                  <p className="text-sm text-white/50 text-center py-4">
                    No live listings found. Try the links below to search manually.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ─── ALSO SEARCH ON (always visible) ─── */}
          <div className="pt-4 border-t border-white/10">
            <div className="flex items-center gap-2 mb-3">
              <Globe className="w-4 h-4 text-white/60" />
              <span className="text-sm font-semibold text-white/80">Search on vendor sites:</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(searchUrls).map(([key, url]) => {
                const info = VENDOR_INFO[key] || { name: key, icon: '🔗', color: 'text-white/70', bgColor: 'bg-white/5' };
                return (
                  <a
                    key={key}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-2 p-3 rounded-lg ${info.bgColor} hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all`}
                  >
                    <span className="text-lg">{info.icon}</span>
                    <span className={`text-sm font-medium ${info.color}`}>{info.name}</span>
                    <ExternalLink className="w-3 h-3 text-white/30 ml-auto" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Source */}
          {part.source && (
            <p className="text-xs text-white/30 pt-2 border-t border-white/5">
              Source: {part.source === 'ai_diagnostic' ? 'AI Diagnostic Session' : part.source}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
