import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, DollarSign, Wrench, ExternalLink, Star, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Checkbox } from '@/components/ui/checkbox';

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

const difficultyColors = {
  easy: 'bg-green-500/20 text-green-400 border-green-500/30',
  moderate: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  difficult: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  professional: 'bg-red-500/20 text-red-400 border-red-500/30'
};

export default function PartCard({ part, onClick, compareMode, isSelected }) {
  const categoryIcon = categoryIcons[part.category] || '📦';
  const priceRange = part.price_range 
    ? `$${part.price_range.min} - $${part.price_range.max}`
    : 'Price varies';

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <Card 
        onClick={onClick}
        className={`bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer ${
          isSelected ? 'ring-2 ring-orange-500 bg-orange-500/10' : ''
        }`}
      >
        <CardContent className="p-4">
          {/* Compare Checkbox */}
          {compareMode && (
            <div className="flex justify-end mb-2">
              <Checkbox 
                checked={isSelected} 
                onCheckedChange={(e) => {
                  e.stopPropagation();
                  onClick();
                }}
                className="border-white/20"
              />
            </div>
          )}
          {/* Header */}
          <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500/20 to-orange-600/20 flex items-center justify-center text-2xl flex-shrink-0">
              {categoryIcon}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-white mb-1 line-clamp-1">{part.name}</h3>
              <p className="text-xs text-white/50 font-mono">{part.part_number}</p>
            </div>
          </div>

          {/* Description */}
          {part.description && (
            <p className="text-sm text-white/70 mb-3 line-clamp-2">{part.description}</p>
          )}

          {/* Badges */}
          <div className="flex flex-wrap gap-2 mb-3">
            <Badge variant="outline" className="border-white/20 text-white/70 text-xs">
              {part.part_type === 'OEM' ? 'OEM' : part.part_type === 'aftermarket' ? 'Aftermarket' : 'Remanufactured'}
            </Badge>
            {part.installation_difficulty && (
              <Badge 
                variant="outline" 
                className={`text-xs ${difficultyColors[part.installation_difficulty]}`}
              >
                <Wrench className="w-3 h-3 mr-1" />
                {part.installation_difficulty}
              </Badge>
            )}
          </div>

          {/* Compatible Trucks */}
          {part.compatible_makes && part.compatible_makes.length > 0 && (
            <div className="text-xs text-white/50 mb-3">
              Compatible: {part.compatible_makes.slice(0, 3).join(', ')}
              {part.compatible_makes.length > 3 && ` +${part.compatible_makes.length - 3}`}
            </div>
          )}

          {/* Rating */}
          {part.average_rating > 0 && (
            <div className="flex items-center gap-1 mb-3">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              <span className="text-xs text-white/70 font-medium">{part.average_rating.toFixed(1)}</span>
              <span className="text-xs text-white/50">({part.review_count})</span>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-white/10">
            <div className="text-sm font-semibold text-orange-400">
              {priceRange}
            </div>
            <ExternalLink className="w-4 h-4 text-white/40" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
