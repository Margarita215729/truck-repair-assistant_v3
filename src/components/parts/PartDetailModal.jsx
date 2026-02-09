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
  Package, 
  DollarSign, 
  Wrench, 
  ExternalLink, 
  Clock, 
  AlertCircle,
  Video,
  FileText,
  MessageSquare,
  ShoppingCart
} from 'lucide-react';

const categoryIcons = {
  engine: '🔧',
  transmission: '⚙️',
  brakes: '🛑',
  electrical: '⚡',
  exhaust: '💨',
  fuel_system: '⛽',
  cooling: '❄️',
  suspension: '🔩',
  drivetrain: '🔄',
  body: '🚛',
  filters: '🔍',
  sensors: '📡',
  other: '📦'
};

const difficultyInfo = {
  easy: { color: 'text-green-400', desc: 'Can be done with basic tools' },
  moderate: { color: 'text-yellow-400', desc: 'Requires some mechanical experience' },
  difficult: { color: 'text-orange-400', desc: 'Advanced mechanical skills needed' },
  professional: { color: 'text-red-400', desc: 'Professional installation recommended' }
};

export default function PartDetailModal({ part, open, onClose }) {
  if (!part) return null;

  const categoryIcon = categoryIcons[part.category] || '📦';
  const diffInfo = difficultyInfo[part.installation_difficulty] || difficultyInfo.moderate;
  const priceRange = part.price_range 
    ? `$${part.price_range.min} - $${part.price_range.max}`
    : 'Price varies';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-[#1a1a1a] border-white/10 text-white">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-600/20 flex items-center justify-center text-4xl flex-shrink-0">
              {categoryIcon}
            </div>
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold text-white mb-2">{part.name}</DialogTitle>
              <p className="text-sm text-white/50 font-mono mb-2">{part.part_number}</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="border-orange-500/30 text-orange-400">
                  {part.part_type === 'OEM' ? 'OEM' : part.part_type === 'aftermarket' ? 'Aftermarket' : 'Remanufactured'}
                </Badge>
                {part.manufacturer && (
                  <Badge variant="outline" className="border-white/20 text-white/70">
                    {part.manufacturer}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Description */}
          {part.description && (
            <div>
              <h3 className="text-sm font-semibold text-white/90 mb-2">Description</h3>
              <p className="text-white/70">{part.description}</p>
            </div>
          )}

          {/* Price & Installation */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-orange-400" />
                <span className="text-sm text-white/60">Price Range</span>
              </div>
              <p className="text-xl font-bold text-orange-400">{priceRange}</p>
            </div>
            
            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Wrench className="w-4 h-4 text-white/60" />
                <span className="text-sm text-white/60">Installation</span>
              </div>
              <p className={`text-lg font-semibold ${diffInfo.color} capitalize`}>
                {part.installation_difficulty}
              </p>
              <p className="text-xs text-white/50 mt-1">{diffInfo.desc}</p>
            </div>
          </div>

          {/* Compatibility */}
          <div>
            <h3 className="text-sm font-semibold text-white/90 mb-3">Compatibility</h3>
            <div className="space-y-2">
              {part.compatible_makes && part.compatible_makes.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  <span className="text-sm text-white/60">Makes:</span>
                  {part.compatible_makes.map((make, i) => (
                    <Badge key={i} variant="outline" className="border-white/20 text-white/70">
                      {make}
                    </Badge>
                  ))}
                </div>
              )}
              {part.year_range && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-white/60" />
                  <span className="text-sm text-white/70">
                    {part.year_range.from} - {part.year_range.to || 'Present'}
                  </span>
                </div>
              )}
              {part.average_lifespan && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-white/60" />
                  <span className="text-sm text-white/70">Average Lifespan: {part.average_lifespan}</span>
                </div>
              )}
            </div>
          </div>

          {/* Related Issues */}
          {(part.related_error_codes?.length > 0 || part.related_symptoms?.length > 0) && (
            <div>
              <h3 className="text-sm font-semibold text-white/90 mb-3">Related Issues</h3>
              <div className="space-y-3">
                {part.related_error_codes?.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-4 h-4 text-red-400" />
                      <span className="text-sm text-white/60">Error Codes</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {part.related_error_codes.map((code, i) => (
                        <Badge key={i} variant="outline" className="border-red-500/30 text-red-400 font-mono">
                          {code}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {part.related_symptoms?.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-4 h-4 text-yellow-400" />
                      <span className="text-sm text-white/60">Symptoms</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1">
                      {part.related_symptoms.map((symptom, i) => (
                        <li key={i} className="text-sm text-white/70">{symptom}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Installation Guides */}
          {part.installation_guides?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-white/90 mb-3">Installation Guides</h3>
              <div className="space-y-2">
                {part.installation_guides.map((guide, i) => (
                  <a
                    key={i}
                    href={guide.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all"
                  >
                    {guide.type === 'video' ? (
                      <Video className="w-5 h-5 text-orange-400" />
                    ) : (
                      <FileText className="w-5 h-5 text-blue-400" />
                    )}
                    <span className="flex-1 text-sm text-white/90">{guide.title}</span>
                    <ExternalLink className="w-4 h-4 text-white/40" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Forum Discussions */}
          {part.forum_discussions?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-white/90 mb-3">Forum Discussions</h3>
              <div className="space-y-2">
                {part.forum_discussions.map((discussion, i) => (
                  <a
                    key={i}
                    href={discussion.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all"
                  >
                    <MessageSquare className="w-5 h-5 text-green-400" />
                    <div className="flex-1">
                      <p className="text-sm text-white/90">{discussion.title}</p>
                      <p className="text-xs text-white/50">{discussion.forum}</p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-white/40" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Vendor Links */}
          {part.vendor_links?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-white/90 mb-3">Where to Buy</h3>
              <div className="space-y-2">
                {part.vendor_links.map((vendor, i) => (
                  <a
                    key={i}
                    href={vendor.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <ShoppingCart className="w-5 h-5 text-orange-400" />
                      <span className="text-sm text-white/90">{vendor.vendor}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {vendor.price && (
                        <span className="text-sm font-semibold text-orange-400">${vendor.price}</span>
                      )}
                      <ExternalLink className="w-4 h-4 text-white/40" />
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
