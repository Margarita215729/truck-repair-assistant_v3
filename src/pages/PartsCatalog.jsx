import React, { useState, useMemo } from 'react';
import { getMyRecommendedParts, getRecommendedStats, deleteRecommendation } from '@/services/partsService';
import { searchVendors, aggregateListings, vendorKeys } from '@/services/vendorService';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Filter, Loader2, Package, Wrench, ArrowRight, ShoppingCart, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import PartCard from '@/components/parts/PartCard';
import PartFilters from '@/components/parts/PartFilters';
import PartDetailModal from '@/components/parts/PartDetailModal';
import ComparePartsModal from '@/components/parts/ComparePartsModal';
import { useLanguage } from '@/lib/LanguageContext';

export default function PartsCatalog() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  // Tab state
  const [activeTab, setActiveTab] = useState('recommended');

  // Recommended tab state
  const [recFilters, setRecFilters] = useState({ category: 'all', importance: 'all', difficulty: 'all' });

  // Search tab state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSubmitted, setSearchSubmitted] = useState('');
  const [searchFilters, setSearchFilters] = useState({ condition: 'all', vendor: 'all', sort: 'relevance' });
  const [searchMake, setSearchMake] = useState('');
  const [searchModel, setSearchModel] = useState('');
  const [searchYear, setSearchYear] = useState('');

  const [showFilters, setShowFilters] = useState(false);
  const [selectedPart, setSelectedPart] = useState(null);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState([]);
  const [showCompareModal, setShowCompareModal] = useState(false);

  // ─── Recommended tab: fetch user's AI recommendations ──────────────
  const { data: recommended = [], isLoading: recLoading, refetch: refetchRec } = useQuery({
    queryKey: ['my-parts', recFilters],
    queryFn: () => getMyRecommendedParts(recFilters),
    keepPreviousData: true,
  });

  const { data: stats } = useQuery({
    queryKey: ['parts-stats'],
    queryFn: getRecommendedStats,
    staleTime: 60_000,
  });

  // ─── Search tab: live vendor search ────────────────────────────────
  const { data: vendorResults, isLoading: searchLoading } = useQuery({
    queryKey: vendorKeys.search(searchSubmitted, { make: searchMake, model: searchModel, year: searchYear, condition: searchFilters.condition }),
    queryFn: () => searchVendors(searchSubmitted, {
      make: searchMake,
      model: searchModel,
      year: searchYear,
      condition: searchFilters.condition,
    }),
    enabled: !!searchSubmitted,
    staleTime: 5 * 60_000,
    keepPreviousData: true,
  });

  const vendorListings = useMemo(() => {
    if (!vendorResults) return [];
    let all = aggregateListings(vendorResults);
    // Filter by vendor source
    if (searchFilters.vendor && searchFilters.vendor !== 'all') {
      all = all.filter(l => l.vendor.toLowerCase().includes(searchFilters.vendor.toLowerCase()));
    }
    // Sort
    if (searchFilters.sort === 'price_asc') {
      all.sort((a, b) => (a.price || Infinity) - (b.price || Infinity));
    } else if (searchFilters.sort === 'price_desc') {
      all.sort((a, b) => (b.price || 0) - (a.price || 0));
    }
    return all;
  }, [vendorResults, searchFilters]);

  const handleSearch = (e) => {
    e?.preventDefault();
    if (searchQuery.trim()) {
      setSearchSubmitted(searchQuery.trim());
    }
  };

  const togglePartForCompare = (part) => {
    setSelectedForCompare(prev => {
      const exists = prev.find(p => (p.id || p.itemUrl) === (part.id || part.itemUrl));
      if (exists) return prev.filter(p => (p.id || p.itemUrl) !== (part.id || part.itemUrl));
      if (prev.length >= 4) {
        toast.error('Maximum 4 items for comparison');
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

  const handleDeleteRec = async (id) => {
    try {
      await deleteRecommendation(id);
      refetchRec();
      toast.success('Recommendation removed');
    } catch {
      toast.error('Failed to remove');
    }
  };

  const categoryBreakdown = useMemo(() => {
    if (!stats?.categories) return [];
    return Object.entries(stats.categories).sort(([, a], [, b]) => b - a).slice(0, 6);
  }, [stats]);

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{t('parts.title')}</h1>
            <p className="text-white/60">{t('parts.subtitle')}</p>
          </div>
          {stats?.total > 0 && (
            <div className="hidden md:flex items-center gap-4">
              <div className="text-right">
                <p className="text-2xl font-bold text-orange-400">{stats.total}</p>
                <p className="text-xs text-white/50">recommendations</p>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-white/5 border border-white/10 mb-6">
            <TabsTrigger value="recommended" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white gap-2">
              <Package className="w-4 h-4" />
              Recommended
              {stats?.total > 0 && (
                <Badge className="ml-1 bg-orange-600 text-white text-[10px] h-4 px-1.5">{stats.total}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="search" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white gap-2">
              <ShoppingCart className="w-4 h-4" />
              Search Vendors
            </TabsTrigger>
          </TabsList>

          {/* ═══ RECOMMENDED TAB ═══ */}
          <TabsContent value="recommended">
            {/* Filters */}
            <div className="mb-6 space-y-4">
              <div className="flex gap-3">
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
                  onClick={() => { setCompareMode(!compareMode); if (compareMode) setSelectedForCompare([]); }}
                  className={compareMode ? "bg-orange-500 hover:bg-orange-600" : "border-white/20 bg-white/5 hover:bg-white/10 text-white"}
                >
                  {t('parts.compare')}
                </Button>
              </div>

              <AnimatePresence>
                {showFilters && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                    <PartFilters mode="recommended" filters={recFilters} onFiltersChange={setRecFilters} />
                  </motion.div>
                )}
              </AnimatePresence>

              {compareMode && selectedForCompare.length > 0 && (
                <div className="flex items-center justify-between p-3 bg-orange-500/10 border border-orange-500/30 rounded-xl">
                  <span className="text-sm text-white">{selectedForCompare.length} selected</span>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => setShowCompareModal(true)} disabled={selectedForCompare.length < 2} className="bg-orange-500 hover:bg-orange-600">
                      Compare
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setSelectedForCompare([])} className="border-white/20 text-white hover:bg-white/10">
                      Clear
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Category chips */}
            {categoryBreakdown.length > 0 && recFilters.category === 'all' && (
              <div className="flex flex-wrap gap-2 mb-4">
                {categoryBreakdown.map(([cat, count]) => (
                  <Badge
                    key={cat}
                    variant="outline"
                    onClick={() => setRecFilters(prev => ({ ...prev, category: cat }))}
                    className="cursor-pointer border-white/20 text-white/70 hover:bg-white/10 transition-colors capitalize"
                  >
                    {cat.replace('_', ' ')} ({count})
                  </Badge>
                ))}
              </div>
            )}

            {/* Recommended results */}
            {recLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
              </div>
            ) : recommended.length === 0 ? (
              <div className="text-center py-16 max-w-lg mx-auto">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500/20 to-orange-600/20 flex items-center justify-center mx-auto mb-6">
                  <Package className="w-10 h-10 text-orange-500" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">No Recommendations Yet</h3>
                <p className="text-white/60 mb-2">
                  Parts are automatically added here when our diagnostic system recommends them for your truck.
                </p>
                <p className="text-white/50 text-sm mb-8">
                  Start a diagnostic session or search vendors directly for live pricing.
                </p>
                <div className="flex gap-3 justify-center">
                  <Button onClick={() => navigate('/diagnostics')} className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 h-12 px-6">
                    <Wrench className="w-5 h-5 mr-2" />
                    Start Diagnostics
                  </Button>
                  <Button onClick={() => setActiveTab('search')} variant="outline" className="border-white/20 text-white hover:bg-white/10 h-12 px-6">
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    Search Vendors
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-4 text-sm text-white/60">
                  {recommended.length} {recommended.length !== 1 ? 'recommendations' : 'recommendation'}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recommended.map(part => (
                    <PartCard
                      key={part.id}
                      part={part}
                      variant="recommended"
                      onClick={() => handlePartClick(part)}
                      onDelete={() => handleDeleteRec(part.id)}
                      compareMode={compareMode}
                      isSelected={selectedForCompare.some(p => p.id === part.id)}
                    />
                  ))}
                </div>
              </>
            )}
          </TabsContent>

          {/* ═══ SEARCH VENDORS TAB ═══ */}
          <TabsContent value="search">
            <form onSubmit={handleSearch} className="mb-6 space-y-4">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by part name, number, or description..."
                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40"
                  />
                </div>
                <Button type="submit" className="bg-orange-500 hover:bg-orange-600 px-6">
                  <Search className="w-4 h-4 mr-2" />
                  Search
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="border-white/20 bg-white/5 hover:bg-white/10 text-white"
                >
                  <Filter className="w-4 h-4" />
                </Button>
              </div>

              {/* Optional truck context */}
              <div className="grid grid-cols-3 gap-3">
                <Input
                  value={searchMake}
                  onChange={(e) => setSearchMake(e.target.value)}
                  placeholder="Make (e.g., Freightliner)"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/40 text-sm"
                />
                <Input
                  value={searchModel}
                  onChange={(e) => setSearchModel(e.target.value)}
                  placeholder="Model (e.g., Cascadia)"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/40 text-sm"
                />
                <Input
                  value={searchYear}
                  onChange={(e) => setSearchYear(e.target.value)}
                  placeholder="Year (e.g., 2019)"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/40 text-sm"
                />
              </div>

              <AnimatePresence>
                {showFilters && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                    <PartFilters mode="search" filters={searchFilters} onFiltersChange={setSearchFilters} />
                  </motion.div>
                )}
              </AnimatePresence>
            </form>

            {/* Vendor search results */}
            {searchLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                <p className="text-sm text-white/50">Searching eBay, FinditParts, and more...</p>
              </div>
            ) : searchSubmitted && vendorResults ? (
              <>
                {/* Search URLs — always shown */}
                {vendorResults.searchUrls && (
                  <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2 mb-3">
                      <Globe className="w-4 h-4 text-white/60" />
                      <span className="text-sm font-semibold text-white/80">Also search on:</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(vendorResults.searchUrls).map(([key, url]) => (
                        <a
                          key={key}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-sm text-white/70 hover:text-white transition-all"
                        >
                          {key === 'ebay' ? '🛒' : key === 'rockauto' ? '🔧' : key === 'amazon' ? '📦' : key === 'googleShopping' ? '🔍' : key === 'finditparts' ? '🚛' : key === 'fleetpride' ? '🏪' : '🔩'}
                          <span className="capitalize">{key === 'googleShopping' ? 'Google' : key === 'finditparts' ? 'FinditParts' : key === 'fleetpride' ? 'FleetPride' : key === 'truckpro' ? 'TruckPro' : key}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {vendorListings.length > 0 ? (
                  <>
                    <div className="mb-4 flex items-center justify-between">
                      <span className="text-sm text-white/60">
                        {vendorListings.length} {vendorListings.length !== 1 ? 'listings' : 'listing'} found
                        {vendorResults.meta?.sources?.ebay && ' from eBay'}
                        {vendorResults.meta?.sources?.finditparts && ', FinditParts'}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {vendorListings.map((listing, idx) => (
                        <PartCard
                          key={listing.itemUrl || idx}
                          part={listing}
                          variant="vendor"
                          onClick={() => handlePartClick(listing)}
                          compareMode={compareMode}
                          isSelected={selectedForCompare.some(p => p.itemUrl === listing.itemUrl)}
                        />
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-16">
                    <Package className="w-16 h-16 mx-auto mb-4 text-white/20" />
                    <h3 className="text-xl font-semibold text-white mb-2">No live listings found</h3>
                    <p className="text-white/60 mb-4">Try the search links above to browse vendors directly.</p>
                  </div>
                )}
              </>
            ) : !searchSubmitted ? (
              <div className="text-center py-20">
                <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-white/20" />
                <h3 className="text-xl font-semibold text-white mb-2">Search Vendor Inventory</h3>
                <p className="text-white/60">
                  Enter a part name, OEM number, or description to find live pricing from eBay, FinditParts, RockAuto, and more.
                </p>
              </div>
            ) : null}
          </TabsContent>
        </Tabs>
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
