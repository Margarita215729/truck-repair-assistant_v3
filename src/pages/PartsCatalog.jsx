import React, { useState, useMemo } from 'react';
import { getMyRecommendedParts, getRecommendedStats, deleteRecommendation } from '@/services/partsService';
import { searchVendors, aggregateListings, vendorKeys, groupByTier, VENDOR_INFO, SOURCE_TIER_LABELS, getSearchUrls } from '@/services/vendorService';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Filter, Loader2, Package, Wrench, ShoppingCart, Globe, ExternalLink, AlertTriangle, ShieldCheck, Bookmark, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import PartCard from '@/components/parts/PartCard';
import PartFilters from '@/components/parts/PartFilters';
import PartDetailModal from '@/components/parts/PartDetailModal';
import ComparePartsModal from '@/components/parts/ComparePartsModal';
import { useLanguage } from '@/lib/LanguageContext';

// ─── Search input classifier ────────────────────────────────────────
function classifySearch(input) {
  if (!input) return { type: 'free_text', value: input };
  const trimmed = input.trim();
  // Part number pattern: alphanumeric with hyphens, 4+ chars, starts with letter/digit
  if (/^[A-Za-z0-9][\w\-]{3,}$/.test(trimmed) && /\d/.test(trimmed)) {
    return { type: 'part_number', value: trimmed };
  }
  // VIN: 17 alphanumeric chars
  if (/^[A-HJ-NPR-Z0-9]{17}$/i.test(trimmed)) {
    return { type: 'vin', value: trimmed };
  }
  // Fault/DTC code: starts with P/B/C/U followed by 4 digits, or SPN/FMI pattern
  if (/^[PBCU]\d{4}$/i.test(trimmed) || /^SPN\s?\d+/i.test(trimmed)) {
    return { type: 'fault_code', value: trimmed };
  }
  return { type: 'free_text', value: trimmed };
}

export default function PartsCatalog() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Tab state — 4 tabs
  const [activeTab, setActiveTab] = useState('for_issue');

  // Recommended / For This Issue filters
  const [recFilters, setRecFilters] = useState({ category: 'all', importance: 'all', urgency: 'all', driveability: 'all', action_type: 'all' });

  // Search tab state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSubmitted, setSearchSubmitted] = useState('');
  const [searchFilters, setSearchFilters] = useState({ condition: 'all', sourceType: 'all', sourceTier: 'all', sort: 'relevance' });
  const [searchMake, setSearchMake] = useState('');
  const [searchModel, setSearchModel] = useState('');
  const [searchYear, setSearchYear] = useState('');
  const [searchPartNumber, setSearchPartNumber] = useState('');

  const [showFilters, setShowFilters] = useState(false);
  const [selectedPart, setSelectedPart] = useState(null);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState([]);
  const [showCompareModal, setShowCompareModal] = useState(false);

  // ─── For This Issue & Saved: fetch user's AI recommendations ───────
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
    queryKey: vendorKeys.search(searchSubmitted, { partNumber: searchPartNumber, make: searchMake, model: searchModel, year: searchYear, condition: searchFilters.condition }),
    queryFn: () => searchVendors(searchSubmitted, {
      partNumber: searchPartNumber,
      make: searchMake,
      model: searchModel,
      year: searchYear,
      condition: searchFilters.condition,
    }),
    enabled: !!searchSubmitted,
    staleTime: 5 * 60_000,
    keepPreviousData: true,
  });

  // Aggregated and filtered vendor listings
  const vendorListings = useMemo(() => {
    if (!vendorResults) return [];
    let all = aggregateListings(vendorResults);
    // Filter by source type
    if (searchFilters.sourceType && searchFilters.sourceType !== 'all') {
      all = all.filter(l => l.sourceType === searchFilters.sourceType);
    }
    // Filter by source tier
    if (searchFilters.sourceTier && searchFilters.sourceTier !== 'all') {
      all = all.filter(l => String(l.sourceTier) === searchFilters.sourceTier);
    }
    // Sort
    if (searchFilters.sort === 'price_asc') {
      all.sort((a, b) => (a.price || Infinity) - (b.price || Infinity));
    } else if (searchFilters.sort === 'price_desc') {
      all.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (searchFilters.sort === 'trust') {
      all.sort((a, b) => (a.sourceTier || 4) - (b.sourceTier || 4));
    }
    return all;
  }, [vendorResults, searchFilters]);

  // Buy Fast: group all vendor listings by tier
  const tieredListings = useMemo(() => {
    if (!vendorResults) return null;
    const all = aggregateListings(vendorResults);
    return groupByTier(all);
  }, [vendorResults]);

  const handleSearch = (e) => {
    e?.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    const classified = classifySearch(q);
    if (classified.type === 'part_number') {
      setSearchPartNumber(classified.value);
    }
    setSearchSubmitted(q);
  };

  const togglePartForCompare = (part) => {
    setSelectedForCompare(prev => {
      const exists = prev.find(p => (p.id || p.itemUrl) === (part.id || part.itemUrl));
      if (exists) return prev.filter(p => (p.id || p.itemUrl) !== (part.id || part.itemUrl));
      if (prev.length >= 4) {
        toast.error(t('parts.maxCompare') || 'Maximum 4 items for comparison');
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
    const previous = queryClient.getQueryData(['my-parts', recFilters]);
    queryClient.setQueryData(['my-parts', recFilters], (old) =>
      old ? old.filter(p => p.id !== id) : []
    );
    try {
      await deleteRecommendation(id);
      queryClient.setQueriesData({ queryKey: ['my-parts'] }, (old) =>
        Array.isArray(old) ? old.filter(p => p.id !== id) : old
      );
      queryClient.invalidateQueries({ queryKey: ['parts-stats'] });
      toast.success(t('parts.recommendationRemoved') || 'Recommendation removed');
    } catch {
      queryClient.setQueryData(['my-parts', recFilters], previous);
      toast.error(t('parts.removeFailed') || 'Failed to remove');
    }
  };

  const categoryBreakdown = useMemo(() => {
    if (!stats?.categories) return [];
    return Object.entries(stats.categories).sort(([, a], [, b]) => b - a).slice(0, 6);
  }, [stats]);

  // ─── Render search URL links ───────────────────────────────────────
  const renderSearchUrls = (urls) => {
    if (!urls) return null;
    return (
      <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
        <div className="flex items-center gap-2 mb-3">
          <Globe className="w-4 h-4 text-white/60" />
          <span className="text-sm font-semibold text-white/80">{t('parts.alsoSearchOn') || 'Also search on:'}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(urls).map(([key, url]) => {
            const info = VENDOR_INFO[key];
            return (
              <a
                key={key}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-sm text-white/70 hover:text-white transition-all"
              >
                {info?.icon || '🔗'}
                <span>{info?.name || key}</span>
                <ExternalLink className="w-3 h-3 opacity-40" />
              </a>
            );
          })}
        </div>
      </div>
    );
  };

  // ─── Compare bar ───────────────────────────────────────────────────
  const renderCompareBar = () => {
    if (!compareMode || selectedForCompare.length === 0) return null;
    return (
      <div className="flex items-center justify-between p-3 bg-orange-500/10 border border-orange-500/30 rounded-xl mb-4">
        <span className="text-sm text-white">{selectedForCompare.length} {t('parts.selected') || 'selected'}</span>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setShowCompareModal(true)} disabled={selectedForCompare.length < 2} className="bg-orange-500 hover:bg-orange-600">
            Compare
          </Button>
          <Button size="sm" variant="outline" onClick={() => setSelectedForCompare([])} className="border-white/20 text-white hover:bg-white/10">
            Clear
          </Button>
        </div>
      </div>
    );
  };

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
                <p className="text-xs text-white/50">{t('parts.recommendations') || 'recommendations'}</p>
              </div>
            </div>
          )}
        </div>

        {/* 4-tab layout */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-white/5 border border-white/10 mb-6 flex-wrap">
            <TabsTrigger value="for_issue" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white gap-2">
              <AlertTriangle className="w-4 h-4" />
              {t('parts.tabForIssue') || 'For This Issue'}
              {stats?.total > 0 && (
                <Badge className="ml-1 bg-orange-600 text-white text-[10px] h-4 px-1.5">{stats.total}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="search" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white gap-2">
              <Search className="w-4 h-4" />
              {t('parts.tabSearch') || 'Search Parts'}
            </TabsTrigger>
            <TabsTrigger value="buy_fast" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white gap-2">
              <Zap className="w-4 h-4" />
              {t('parts.tabBuyFast') || 'Buy Fast'}
            </TabsTrigger>
            <TabsTrigger value="saved" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white gap-2">
              <Bookmark className="w-4 h-4" />
              {t('parts.tabSaved') || 'Saved'}
            </TabsTrigger>
          </TabsList>

          {/* ═══ TAB 1: FOR THIS ISSUE ═══ */}
          <TabsContent value="for_issue">
            <div className="mb-6 space-y-4">
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="border-white/20 bg-white/5 hover:bg-white/10 text-white"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  {t('parts.filters') || 'Filters'}
                </Button>
                <Button
                  variant={compareMode ? "default" : "outline"}
                  onClick={() => { setCompareMode(!compareMode); if (compareMode) setSelectedForCompare([]); }}
                  className={compareMode ? "bg-orange-500 hover:bg-orange-600" : "border-white/20 bg-white/5 hover:bg-white/10 text-white"}
                >
                  {t('parts.compare') || 'Compare'}
                </Button>
              </div>
              <AnimatePresence>
                {showFilters && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                    <PartFilters mode="recommended" filters={recFilters} onFiltersChange={setRecFilters} />
                  </motion.div>
                )}
              </AnimatePresence>
              {renderCompareBar()}
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

            {recLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
              </div>
            ) : recommended.length === 0 ? (
              <div className="text-center py-16 max-w-lg mx-auto">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500/20 to-orange-600/20 flex items-center justify-center mx-auto mb-6">
                  <AlertTriangle className="w-10 h-10 text-orange-500" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">{t('parts.noRecommendations') || 'No Parts for Current Issues'}</h3>
                <p className="text-white/60 mb-2">
                  Parts appear here automatically when our diagnostic system identifies parts needed for your truck.
                </p>
                <p className="text-white/50 text-sm mb-8">
                  Start a diagnostic session to get part recommendations linked to your issues.
                </p>
                <div className="flex gap-3 justify-center">
                  <Button onClick={() => navigate('/Diagnostics')} className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 h-12 px-6">
                    <Wrench className="w-5 h-5 mr-2" />
                    {t('parts.startDiagnostics') || 'Start Diagnostics'}
                  </Button>
                  <Button onClick={() => setActiveTab('search')} variant="outline" className="border-white/20 text-white hover:bg-white/10 h-12 px-6">
                    <Search className="w-5 h-5 mr-2" />
                    {t('parts.tabSearch') || 'Search Parts'}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-4 text-sm text-white/60">
                  {recommended.length} {recommended.length !== 1 ? (t('parts.recommendations') || 'recommendations') : (t('parts.recommendation') || 'recommendation')}
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

          {/* ═══ TAB 2: SEARCH PARTS ═══ */}
          <TabsContent value="search">
            <form onSubmit={handleSearch} className="mb-6 space-y-4">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('parts.searchPlaceholder') || 'Part name, OEM number, fault code, or description...'}
                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40"
                  />
                </div>
                <Button type="submit" className="bg-orange-500 hover:bg-orange-600 px-6">
                  <Search className="w-4 h-4 mr-2" />
                  {t('parts.search') || 'Search'}
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

              {/* Truck context inputs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Input value={searchMake} onChange={(e) => setSearchMake(e.target.value)} placeholder="Make (e.g., Freightliner)" className="bg-white/5 border-white/10 text-white placeholder:text-white/40 text-sm" />
                <Input value={searchModel} onChange={(e) => setSearchModel(e.target.value)} placeholder="Model (e.g., Cascadia)" className="bg-white/5 border-white/10 text-white placeholder:text-white/40 text-sm" />
                <Input value={searchYear} onChange={(e) => setSearchYear(e.target.value)} placeholder="Year (e.g., 2019)" className="bg-white/5 border-white/10 text-white placeholder:text-white/40 text-sm" />
                <Input value={searchPartNumber} onChange={(e) => setSearchPartNumber(e.target.value)} placeholder="Part Number (OEM)" className="bg-white/5 border-white/10 text-white placeholder:text-white/40 text-sm" />
              </div>

              <AnimatePresence>
                {showFilters && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                    <PartFilters mode="search" filters={searchFilters} onFiltersChange={setSearchFilters} />
                  </motion.div>
                )}
              </AnimatePresence>
            </form>

            {/* Search results */}
            {searchLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                <p className="text-sm text-white/50">Searching vendors and dealers...</p>
              </div>
            ) : searchSubmitted && vendorResults ? (
              <>
                {renderSearchUrls(vendorResults?.searchUrls)}

                {vendorListings.length > 0 ? (
                  <>
                    <div className="mb-4 flex items-center justify-between">
                      <span className="text-sm text-white/60">
                        {vendorListings.length} {vendorListings.length !== 1 ? (t('parts.listings') || 'listings') : (t('parts.listing') || 'listing')} {t('parts.foundLower') || 'found'}
                      </span>
                      <Button
                        variant={compareMode ? "default" : "outline"}
                        size="sm"
                        onClick={() => { setCompareMode(!compareMode); if (compareMode) setSelectedForCompare([]); }}
                        className={compareMode ? "bg-orange-500 hover:bg-orange-600 text-xs" : "border-white/20 bg-white/5 hover:bg-white/10 text-white text-xs"}
                      >
                        {compareMode ? 'Exit Compare' : 'Compare'}
                      </Button>
                    </div>
                    {renderCompareBar()}
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
                      <h3 className="text-xl font-semibold text-white mb-2">{t('parts.noListings') || 'No listings found'}</h3>
                      <p className="text-white/60 mb-4">{t('parts.livePricingUnavailable') || 'Live pricing is currently unavailable.'}</p>
                      <p className="text-white/40 text-sm">Try the search links above to browse vendors directly.</p>
                    </div>
                )}
              </>
            ) : !searchSubmitted ? (
              <div className="text-center py-20">
                <Search className="w-16 h-16 mx-auto mb-4 text-white/20" />
                <h3 className="text-xl font-semibold text-white mb-2">{t('parts.searchTitle') || 'Search Parts'}</h3>
                <p className="text-white/60">
                  {t('parts.searchDesc') || 'Enter a part name, OEM number, fault code, or description to find live pricing.'}
                </p>
              </div>
            ) : null}
          </TabsContent>

          {/* ═══ TAB 3: BUY FAST ═══ */}
          <TabsContent value="buy_fast">
            {!searchSubmitted ? (
              <div className="text-center py-20">
                <Zap className="w-16 h-16 mx-auto mb-4 text-white/20" />
                <h3 className="text-xl font-semibold text-white mb-2">{t('parts.buyFastTitle') || 'Buy Fast — Tiered Results'}</h3>
                <p className="text-white/60 mb-6">
                  {t('parts.buyFastDesc') || 'Browse vendor links grouped by trust level, or search for a part to see live listings here.'}
                </p>

                {/* Always show constructed search URLs even without a search */}
                {renderSearchUrls(getSearchUrls('', '', ''))}

                <Button onClick={() => setActiveTab('search')} className="bg-orange-500 hover:bg-orange-600 mt-4">
                  <Search className="w-4 h-4 mr-2" />
                  {t('parts.tabSearch') || 'Search Parts'}
                </Button>
              </div>
            ) : searchLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
              </div>
            ) : tieredListings ? (
              <div className="space-y-8">
                {renderSearchUrls(vendorResults?.searchUrls)}

                {[1, 2, 3, 4].map(tier => {
                  const tierItems = tieredListings[tier] || [];
                  const tierLabel = SOURCE_TIER_LABELS[tier] || `Tier ${tier}`;
                  const tierColors = {
                    1: 'border-green-500/30 bg-green-500/5',
                    2: 'border-blue-500/30 bg-blue-500/5',
                    3: 'border-yellow-500/30 bg-yellow-500/5',
                    4: 'border-white/10 bg-white/5',
                  };
                  const tierBadgeColors = {
                    1: 'bg-green-500/20 text-green-400 border-green-500/30',
                    2: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
                    3: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
                    4: 'bg-white/10 text-white/60 border-white/20',
                  };
                  return (
                    <div key={tier}>
                      <div className="flex items-center gap-3 mb-3">
                        <Badge className={`${tierBadgeColors[tier]} border text-xs`}>
                          {tier === 1 && <ShieldCheck className="w-3 h-3 mr-1" />}
                          Tier {tier}
                        </Badge>
                        <span className="text-sm font-semibold text-white/80">{tierLabel}</span>
                        <span className="text-xs text-white/40">({tierItems.length} {tierItems.length !== 1 ? (t('parts.listings') || 'listings') : (t('parts.listing') || 'listing')})</span>
                      </div>
                      {tierItems.length > 0 ? (
                        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 rounded-xl border ${tierColors[tier]}`}>
                          {tierItems.map((listing, idx) => (
                            <PartCard
                              key={listing.itemUrl || `${tier}-${idx}`}
                              part={listing}
                              variant="vendor"
                              onClick={() => handlePartClick(listing)}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className={`p-4 rounded-xl border ${tierColors[tier]} text-center`}>
                          <p className="text-sm text-white/40">{t('parts.noTierListings') || 'No listings in this tier. Check the search links above.'}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </TabsContent>

          {/* ═══ TAB 4: SAVED ═══ */}
          <TabsContent value="saved">
            <div className="mb-6 space-y-4">
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="border-white/20 bg-white/5 hover:bg-white/10 text-white"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  {t('parts.filters') || 'Filters'}
                </Button>
              </div>
              <AnimatePresence>
                {showFilters && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                    <PartFilters mode="recommended" filters={recFilters} onFiltersChange={setRecFilters} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {recLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
              </div>
            ) : recommended.length === 0 ? (
              <div className="text-center py-16 max-w-lg mx-auto">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500/20 to-orange-600/20 flex items-center justify-center mx-auto mb-6">
                  <Bookmark className="w-10 h-10 text-orange-500" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">{t('parts.noSaved') || 'No Saved Parts'}</h3>
                <p className="text-white/60 mb-8">
                  Parts recommended by diagnostics are automatically saved here. You can also save parts from search results.
                </p>
                <Button onClick={() => navigate('/Diagnostics')} className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 h-12 px-6">
                  <Wrench className="w-5 h-5 mr-2" />
                  {t('parts.startDiagnostics') || 'Start Diagnostics'}
                </Button>
              </div>
            ) : (
              <>
                <div className="mb-4 text-sm text-white/60">
                  {recommended.length} saved {recommended.length !== 1 ? 'parts' : 'part'}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recommended.map(part => (
                    <PartCard
                      key={part.id}
                      part={part}
                      variant="recommended"
                      onClick={() => handlePartClick(part)}
                      onDelete={() => handleDeleteRec(part.id)}
                    />
                  ))}
                </div>
              </>
            )}
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
