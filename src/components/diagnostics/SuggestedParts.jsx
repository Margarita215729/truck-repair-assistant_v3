import React from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Package, CheckCircle2, DollarSign } from 'lucide-react';

export default function SuggestedParts({ parts, onPartClick }) {
  if (!parts || parts.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 p-4 rounded-xl bg-gradient-to-r from-orange-500/10 to-orange-600/10 border border-orange-500/30"
    >
      <div className="flex items-center gap-2 mb-3">
        <Package className="w-5 h-5 text-orange-400" />
        <h3 className="font-semibold text-white">Suggested Parts</h3>
      </div>

      <div className="space-y-3">
        {parts.map((part, idx) => (
          <div 
            key={idx}
            className="p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer"
            onClick={() => onPartClick?.(part)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <h4 className="font-medium text-white mb-1">{part.name}</h4>
                
                {part.oem_part_number && (
                  <p className="text-xs text-white/50 font-mono mb-2">OEM: {part.oem_part_number}</p>
                )}
                
                {part.fitment_confidence && (
                  <div className="flex items-center gap-1 mb-2">
                    <CheckCircle2 className="w-3 h-3 text-green-400" />
                    <span className="text-xs text-green-400">{part.fitment_confidence}</span>
                  </div>
                )}
                
                {part.compatibility_notes && (
                  <p className="text-xs text-blue-300 mb-2 bg-blue-500/10 rounded px-2 py-1">
                    ✓ {part.compatibility_notes}
                  </p>
                )}
                
                {part.description && (
                  <p className="text-sm text-white/70 mb-2">{part.description}</p>
                )}
                
                {part.why_needed && (
                  <p className="text-xs text-white/60 mb-3 italic border-l-2 border-orange-500/30 pl-2">
                    {part.why_needed}
                  </p>
                )}
                
                {/* Interchangeable Parts */}
                {part.interchangeable_parts && part.interchangeable_parts.length > 0 && (
                  <div className="mb-3 space-y-1.5">
                    <p className="text-xs text-white/50 font-semibold">Alternative Options:</p>
                    {part.interchangeable_parts.map((alt, i) => (
                      <div key={i} className="flex items-center justify-between text-xs bg-white/5 rounded px-2 py-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-white/70">{alt.brand}</span>
                          <code className="text-white/50 text-[10px]">{alt.part_number}</code>
                          <Badge variant="outline" className="border-white/20 text-white/60 text-[10px] h-4">
                            {alt.quality_tier?.replace('_', ' ')}
                          </Badge>
                        </div>
                        {alt.price && (
                          <span className="text-green-400 font-medium flex items-center gap-0.5">
                            <DollarSign className="w-3 h-3" />
                            {alt.price}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                {part.installation_notes && (
                  <p className="text-xs text-yellow-300 bg-yellow-500/10 rounded px-2 py-1 mb-2">
                    ⚙️ {part.installation_notes}
                  </p>
                )}
                
                <div className="flex flex-wrap gap-2">
                  {part.installation_difficulty && (
                    <Badge variant="outline" className="border-white/20 text-white/70 text-xs">
                      {part.installation_difficulty} install
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}