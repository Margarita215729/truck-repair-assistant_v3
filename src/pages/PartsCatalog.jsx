import React, { useState } from 'react';
import { entities } from '@/services/entityService';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Filter, Plus, Loader2, Package } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import PartCard from '@/components/parts/PartCard';
import PartFilters from '@/components/parts/PartFilters';
import PartDetailModal from '@/components/parts/PartDetailModal';
import ComparePartsModal from '@/components/parts/ComparePartsModal';
import { useLanguage } from '@/lib/LanguageContext';

export default function PartsCatalog() {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    category: 'all',
    partType: 'all',
    make: '',
    priceRange: 'all'
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPart, setSelectedPart] = useState(null);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState([]);
  const [showCompareModal, setShowCompareModal] = useState(false);

  const { data: parts = [], isLoading } = useQuery({
    queryKey: ['parts'],
    queryFn: () => entities.Part.list('-created_date', 100)
  });

  const filteredParts = parts.filter(part => {
    const matchesSearch = !searchQuery || 
      part.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      part.part_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      part.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = filters.category === 'all' || part.category === filters.category;
    const matchesType = filters.partType === 'all' || part.part_type === filters.partType;
    const matchesMake = !filters.make || part.compatible_makes?.includes(filters.make);

    return matchesSearch && matchesCategory && matchesType && matchesMake;
  });

  const togglePartForCompare = (part) => {
    setSelectedForCompare(prev => {
      const exists = prev.find(p => p.id === part.id);
      if (exists) {
        return prev.filter(p => p.id !== part.id);
      }
      if (prev.length >= 4) {
        toast.error(t('diagnostics.compareLimit'));
        return prev;
      }
      return [...prev, part];
    });
  };

  const handlePartClick = (part) => {
    if (compareMode) {
      togglePartForCompare(part);
    } else {
      setSelectedPart(part);
    }
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{t('parts.title')}</h1>
            <p className="text-white/60">{t('parts.subtitle')}</p>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('parts.searchPlaceholder')}
                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="border-white/20 bg-white/5 hover:bg-white/10 text-white"
            >
              <Filter className="w-4 h-4 mr-2" />
              {t('parts.filters')}
            </Button>
            <Button
              variant={compareMode ? "default" : "outline"}
              onClick={() => {
                setCompareMode(!compareMode);
                if (compareMode) {
                  setSelectedForCompare([]);
                }
              }}
              className={compareMode ? "bg-orange-500 hover:bg-orange-600" : "border-white/20 bg-white/5 hover:bg-white/10 text-white"}
            >
              {t('parts.compare')}
            </Button>
          </div>

          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <PartFilters filters={filters} onFiltersChange={setFilters} />
            </motion.div>
          )}

          {compareMode && selectedForCompare.length > 0 && (
            <div className="flex items-center justify-between p-3 bg-orange-500/10 border border-orange-500/30 rounded-xl">
              <span className="text-sm text-white">
                {selectedForCompare.length} {selectedForCompare.length !== 1 ? t('parts.partsSelected') : t('parts.partSelected')}
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => setShowCompareModal(true)}
                  disabled={selectedForCompare.length < 2}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  {t('parts.compareSelected')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedForCompare([])}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  {t('common.clear')}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : filteredParts.length === 0 ? (
          <div className="text-center py-20">
            <Package className="w-16 h-16 mx-auto mb-4 text-white/20" />
            <h3 className="text-xl font-semibold text-white mb-2">{t('parts.noParts')}</h3>
            <p className="text-white/60">{t('parts.noPartsDesc')}</p>
          </div>
        ) : (
          <>
            <div className="mb-4 text-sm text-white/60">
              {t('parts.found')} {filteredParts.length} {filteredParts.length !== 1 ? t('parts.parts_plural') : t('parts.part')}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredParts.map(part => (
                <PartCard
                  key={part.id}
                  part={part}
                  onClick={() => handlePartClick(part)}
                  compareMode={compareMode}
                  isSelected={selectedForCompare.some(p => p.id === part.id)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Part Detail Modal */}
      <PartDetailModal
        part={selectedPart}
        open={!!selectedPart}
        onClose={() => setSelectedPart(null)}
      />

      {/* Compare Parts Modal */}
      <ComparePartsModal
        parts={selectedForCompare}
        open={showCompareModal}
        onClose={() => setShowCompareModal(false)}
      />
    </div>
  );
}
