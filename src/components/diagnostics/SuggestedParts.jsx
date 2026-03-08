import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, ExternalLink, Search, Loader2, Globe, AlertTriangle, Car } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { searchVendorsForPart, getSearchUrls, aggregateListings, VENDOR_INFO } from '@/services/vendorService';

export default function SuggestedParts({ parts, onPartClick }) {
  const navigate = useNavigate();
  const [vendorResults, setVendorResults] = useState({});
  const [loadingIdx, setLoadingIdx] = useState(null);

  if (!parts || parts.length === 0) return null;

  const handleFindPrices = async (part, idx) => {
    setLoadingIdx(idx);
    try {
      const results = await searchVendorsForPart(part);
      setVendorResults(prev => ({ ...prev, [idx]: results }));
    } catch {
      const urls = getSearchUrls(part.oem_part_number || '', part.name);
      setVendorResults(prev => ({ ...prev, [idx]: { listings: [], searchUrls: urls } }));
    }
    setLoadingIdx(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 p-4 rounded-xl bg-gradient-to-r from-orange-500/10 to-orange-600/10 border border-orange-500/30"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-orange-400" />
          <h3 className="font-semibold text-white">Suggested Parts</h3>
          <Badge variant="outline" className="border-orange-500/30 text-orange-400 text-xs">
            {parts.length}
          </Badge>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => navigate('/PartsCatalog')}
          className="text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 text-xs h-7 gap-1"
        >
          <ExternalLink className="w-3 h-3" />
          Repair Parts
        </Button>
      </div>

      <div className="space-y-3">
        {parts.map((part, idx) => {
          const results = vendorResults[idx];
          const listings = results ? aggregateListings(results) : [];
          const urls = getSearchUrls(part.oem_part_number || '', part.name);

          return (
            <div 
              key={idx}
              className="p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
            >
              <div className="cursor-pointer" onClick={() => onPartClick?.(part)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h4 className="font-medium text-white mb-1">{part.name}</h4>
                    
                    {part.oem_part_number && (
                      <p className="text-xs text-white/50 font-mono mb-2">OEM: {part.oem_part_number}</p>
                    )}
                    
                    {part.description && (
                      <p className="text-sm text-white/70 mb-2">{part.description}</p>
                    )}
                    
                    {part.why_needed && (
                      <p className="text-xs text-white/60 mb-3 italic border-l-2 border-orange-500/30 pl-2">
                        {part.why_needed}
                      </p>
                    )}
                    
                    {part.installation_notes && (
                      <p className="text-xs text-yellow-300 bg-yellow-500/10 rounded px-2 py-1 mb-2">
                        ⚙️ {part.installation_notes}
                      </p>
                    )}
                    
                    <div className="flex flex-wrap gap-2">
                      {part.urgency && (
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            part.urgency === 'critical' ? 'border-red-500/30 text-red-400'
                              : part.urgency === 'high' ? 'border-orange-500/30 text-orange-400'
                              : part.urgency === 'medium' ? 'border-yellow-500/30 text-yellow-400'
                              : 'border-green-500/30 text-green-400'
                          }`}
                        >
                          {part.urgency === 'critical' && <AlertTriangle className="w-3 h-3 mr-1" />}
                          {part.urgency}
                        </Badge>
                      )}
                      {part.driveability && (
                        <Badge variant="outline" className="border-blue-500/30 text-blue-400 text-xs">
                          <Car className="w-3 h-3 mr-1" />
                          {part.driveability.replace(/_/g, ' ')}
                        </Badge>
                      )}
                      {part.action_type && (
                        <Badge variant="outline" className="border-purple-500/30 text-purple-400 text-xs">
                          {part.action_type.replace(/_/g, ' ')}
                        </Badge>
                      )}
                      {part.installation_difficulty && (
                        <Badge variant="outline" className="border-white/20 text-white/70 text-xs">
                          {part.installation_difficulty} install
                        </Badge>
                      )}
                      {part.importance && (
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            part.importance === 'required'
                              ? 'border-red-500/30 text-red-400'
                              : part.importance === 'recommended'
                                ? 'border-orange-500/30 text-orange-400'
                                : 'border-white/20 text-white/60'
                          }`}
                        >
                          {part.importance}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ─── Find Live Prices button / results ─── */}
              <div className="mt-3 pt-3 border-t border-white/10">
                {!results && loadingIdx !== idx && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => { e.stopPropagation(); handleFindPrices(part, idx); }}
                    className="w-full border-orange-500/30 text-orange-400 hover:bg-orange-500/10 text-xs h-7"
                  >
                    <Search className="w-3 h-3 mr-1" />
                    Find Live Prices
                  </Button>
                )}

                {loadingIdx === idx && (
                  <div className="flex items-center justify-center gap-2 py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-orange-400" />
                    <span className="text-xs text-white/50">Searching vendors...</span>
                  </div>
                )}

                {results && (
                  <div className="space-y-2">
                    {listings.length > 0 ? (
                      listings.slice(0, 3).map((listing, i) => (
                        <a
                          key={i}
                          href={listing.itemUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center justify-between p-2 rounded bg-white/5 hover:bg-white/10 transition-all text-xs"
                        >
                          <div className="flex-1 min-w-0">
                            <span className="text-white/80 line-clamp-1">{listing.title}</span>
                            <span className="text-white/40 block">{listing.vendor} · {listing.condition}</span>
                          </div>
                          <span className="text-orange-400 font-semibold ml-2 flex-shrink-0">
                            {listing.price > 0 ? `$${listing.price.toFixed(2)}` : 'See listing'}
                          </span>
                        </a>
                      ))
                    ) : (
                      <p className="text-xs text-white/50 text-center py-1">No live listings found</p>
                    )}

                    {/* Quick vendor links */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {Object.entries(urls).slice(0, 4).map(([key, url]) => {
                        const vi = VENDOR_INFO[key] || { name: key, icon: '🔗' };
                        return (
                          <a
                            key={key}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-[10px] text-white/60"
                          >
                            <span>{vi.icon}</span> {vi.name}
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-white/30 mt-3 text-center">
        Part recommendations are saved for reference. Prices are live from vendors.
      </p>
    </motion.div>
  );
}