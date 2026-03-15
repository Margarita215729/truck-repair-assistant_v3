import React, { useState, useEffect, useCallback, useRef } from 'react';
import { entities } from '@/services/entityService';
import { fetchAllInfrastructure } from '@/services/truckInfraService';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Toggle } from '@/components/ui/toggle';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Search, 
  MapPin, 
  Loader2, 
  Wrench, 
  ParkingCircle, 
  Truck, 
  RefreshCw,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

import ServiceMap from '@/components/services/ServiceMap';
import ServiceCard from '@/components/services/ServiceCard';
import ServiceFilters from '@/components/services/ServiceFilters';
import TruckParkingCard from '@/components/services/TruckParkingCard';
import WeighStationCard from '@/components/services/WeighStationCard';
import TruckRestrictionCard from '@/components/services/TruckRestrictionCard';
import { useLanguage } from '@/lib/LanguageContext';
import { useTruck } from '@/lib/TruckContext';
import { supabase } from '@/api/supabaseClient';
import { resolveOEMLinks } from '@/services/researchService';

export default function ServiceFinder() {
  const { t } = useLanguage();
  const { truck } = useTruck();
  const [location, setLocation] = useState('');
  const [userCoords, setUserCoords] = useState(null);
  const [services, setServices] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [viewMode, setViewMode] = useState('split');
  const [isLocating, setIsLocating] = useState(false);
  const [showSearchParams, setShowSearchParams] = useState(false);
  const [filters, setFilters] = useState({
    repair: true,
    parking: false,
    towing: false,
    serviceTypes: [],
    is24Hours: false,
    minRating: 0,
    // Infrastructure layers
    showTruckParking: false,
    showWeighStations: true,
    showRestrictions: false,
  });

  // Infrastructure data from Supabase
  const [infraData, setInfraData] = useState({ parking: [], weighStations: [], restrictions: [] });
  const [infraLoading, setInfraLoading] = useState(false);
  const infraCoordsRef = useRef(null); // tracks coords we last fetched infra for
  const [activeSearchCenter, setActiveSearchCenter] = useState(null);

  const { data: allReviews = [] } = useQuery({
    queryKey: ['service-reviews'],
    queryFn: () => entities.ServiceReview.list(),
    enabled: services.length > 0,
  });

  const normalize = (value) => (value || '')
    .toString()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

  const getServiceReviews = (serviceItem) => {
    const name = normalize(serviceItem?.name);
    const address = normalize(serviceItem?.address);
    return allReviews.filter((r) => {
      const byPlaceId = r.service_place_id && serviceItem?.id && r.service_place_id === serviceItem.id;
      if (byPlaceId) return true;
      return normalize(r.service_name) === name && normalize(r.service_address) === address;
    });
  };

  // No auto-geolocation on mount — request only on explicit user action
  // to avoid consuming the browser permission prompt before the user is ready.

  // Fetch infrastructure data — deduped by coords so toggling layers is instant
  const loadInfrastructure = useCallback(async (coords, force = false) => {
    if (!coords) return;
    const key = `${coords[0].toFixed(4)},${coords[1].toFixed(4)}`;
    if (!force && infraCoordsRef.current === key) return; // already fetched for these coords

    setInfraLoading(true);
    try {
      const data = await fetchAllInfrastructure(coords[0], coords[1], 50);
      setInfraData(data);
      infraCoordsRef.current = key;
    } catch (err) {
      console.warn('Infrastructure fetch failed:', err);
      toast.error(t('services.infraFailed'));
    } finally {
      setInfraLoading(false);
    }
  }, [t]);

  // Fetch infra when any layer is enabled and we have coords (no redundant refetch)
  useEffect(() => {
    const anyLayerOn = filters.showTruckParking || filters.showWeighStations || filters.showRestrictions;
    if (userCoords && anyLayerOn) {
      loadInfrastructure(userCoords);
    }
  }, [userCoords, filters.showTruckParking, filters.showWeighStations, filters.showRestrictions, loadInfrastructure]);

  /** Geocode a text address to { lat, lng } via server-side proxy */
  const geocodeAddress = async (address) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        throw new Error(t('services.authRequired') || 'Please sign in to search for services.');
      }

      const res = await fetch('/api/geocode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ address }),
      });
      if (!res.ok) {
        let detail = '';
        try {
          const errBody = await res.json();
          detail = errBody?.error || '';
        } catch {
          // ignore parse failure
        }
        throw new Error(detail || `Geocode failed (HTTP ${res.status})`);
      }
      const data = await res.json();
      if (data.lat && data.lng) {
        return { lat: data.lat, lng: data.lng };
      }
    } catch (err) {
      console.warn('Geocoding failed:', err);
      toast.error(err?.message || t('services.locationFailed'));
    }
    return null;
  };

  const searchServices = async (searchLocation, overrideCoords = null, overrideFilters = null) => {
    const activeFilters = overrideFilters || filters;
    let coords = overrideCoords || null;

    const hasTypedLocation = !!searchLocation?.trim();

    // Precedence: override coords > typed location > existing user coords
    if (!coords && hasTypedLocation) {
      const geo = await geocodeAddress(searchLocation.trim());
      if (!geo) {
        toast.error(t('services.locationFailed'));
        return;
      }
      coords = [geo.lat, geo.lng];
      setUserCoords(coords);
    }

    if (!coords) {
      coords = userCoords;
    }

    if (!coords) {
      toast.error(t('services.locationRequired'));
      return;
    }

    setIsLoading(true);
    setServices([]);

    try {
      // Determine which types to search based on active filters
      const types = [];
      if (activeFilters.repair) types.push('repair');
      if (activeFilters.parking) types.push('parking');
      if (activeFilters.towing) types.push('towing');
      if (types.length === 0) types.push('repair', 'parking', 'towing');

      // Get auth token (non-blocking — proceed even without it for graceful error)
      let authToken = null;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        authToken = session?.access_token;
      } catch (authErr) {
        console.warn('Failed to get session for places search:', authErr);
      }

      if (!authToken) {
        toast.error(t('services.authRequired') || 'Please sign in to search for services.');
        return;
      }

      const response = await fetch('/api/places-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken && { Authorization: `Bearer ${authToken}` }),
        },
        body: JSON.stringify({
          lat: coords[0],
          lng: coords[1],
          // Geography is resolved via coords; do not overload with free-text location query
          query: undefined,
          types,
          serviceTypes: activeFilters.serviceTypes?.length > 0 ? activeFilters.serviceTypes : undefined,
          radius: 40000,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          toast.error(t('services.authRequired') || 'Session expired. Please sign in again.');
          return;
        }
        // Try to read server error message
        let serverMsg = '';
        try {
          const errBody = await response.json();
          serverMsg = errBody.error || '';
        } catch { /* ignore parse error */ }
        throw new Error(serverMsg || `HTTP ${response.status}`);
      }
      const data = await response.json();

      let results = data.services || [];

      if (results.length > 0) {
        setServices(results);
        if (data.search_center) {
          const newCoords = [data.search_center.lat, data.search_center.lng];
          setUserCoords(newCoords);
          setActiveSearchCenter(newCoords);
          loadInfrastructure(newCoords);
        } else {
          setActiveSearchCenter(coords);
          loadInfrastructure(coords);
        }
      } else {
        toast.info(t('services.noServicesFound'));
        setActiveSearchCenter(coords);
        if (coords) loadInfrastructure(coords);
      }
    } catch (error) {
      console.error('Error searching services:', error);
      toast.error(`${t('services.searchFailed')} ${error.message || ''}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    searchServices(location);
  };

  const handleUseCurrentLocation = async () => {
    // If we already have coords, just search
    if (userCoords) {
      searchServices('', userCoords);
      return;
    }

    if (!navigator.geolocation) {
      toast.error(t('services.locationFailed'));
      return;
    }

    // Check permission state via Permissions API (if available)
    if (navigator.permissions) {
      try {
        const status = await navigator.permissions.query({ name: 'geolocation' });
        if (status.state === 'denied') {
          toast.error(
            t('services.locationDeniedReset') ||
            'Location is blocked for this site. To fix: click the lock/settings icon in the address bar → reset location permission → reload the page.'
          );
          return;
        }
      } catch {
        // Permissions API not supported for geolocation in this browser — continue anyway
      }
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = [position.coords.latitude, position.coords.longitude];
        setUserCoords(coords);
        setIsLocating(false);
        searchServices('', coords);
      },
      (err) => {
        setIsLocating(false);
        if (err.code === 1) {
          toast.error(
            t('services.locationDeniedReset') ||
            'Location is blocked. Click the lock icon in the address bar → reset location permission → reload the page.'
          );
        } else if (err.code === 3) {
          toast.error(t('services.locationTimeout') || 'Location request timed out. Please try again or enter an address.');
        } else {
          toast.error(t('services.locationFailed'));
        }
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  };

  const handleFilterChange = (newFilters) => {
    const apiChanged =
      newFilters.repair !== filters.repair ||
      newFilters.parking !== filters.parking ||
      newFilters.towing !== filters.towing ||
      JSON.stringify(newFilters.serviceTypes) !== JSON.stringify(filters.serviceTypes);

    setFilters(newFilters);

    // Auto re-search when API-affecting filters change and we already have results
    if (apiChanged && userCoords && services.length > 0) {
      searchServices(location, null, newFilters);
    }
  };

  const toggleFilter = (type) => {
    handleFilterChange({ ...filters, [type]: !filters[type] });
  };

  const handleResetFilters = () => {
    handleFilterChange({
      repair: true,
      parking: false,
      towing: false,
      serviceTypes: [],
      is24Hours: false,
      minRating: 0,
      showTruckParking: false,
      showWeighStations: true,
      showRestrictions: false,
    });
  };

  const filteredServices = services.filter(s => {
    // Category filter (repair / parking / towing)
    if (!filters[s.type]) return false;
    // 24/7 filter
    if (filters.is24Hours && !s.is24Hours) return false;
    // Minimum rating filter
    if (filters.minRating > 0 && s.rating < filters.minRating) return false;
    return true;
  });

  const serviceCounts = {
    repair: services.filter(s => s.type === 'repair').length,
    parking: services.filter(s => s.type === 'parking').length,
    towing: services.filter(s => s.type === 'towing').length,
    truckParking: infraData.parking.length,
    weighStations: infraData.weighStations.length,
    restrictions: infraData.restrictions.length,
  };

  // Combined list items for the list view (services + infrastructure)
  const listItems = [
    ...filteredServices.map(s => ({ ...s, _listType: 'service' })),
    ...(filters.showTruckParking ? infraData.parking.map(p => ({ ...p, _listType: 'truck_parking' })) : []),
    ...infraData.weighStations.map(w => ({ ...w, _listType: 'weigh_station' })),
    ...(filters.showRestrictions ? infraData.restrictions.map(r => ({ ...r, _listType: 'truck_restriction' })) : []),
  ];

  return (
    <div className="min-h-screen">
      <div className="bg-[#0a0a0a] border-b border-white/5 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3">
          {/* Compact search bar — always visible */}
          <div className="flex items-center gap-2">
            <form onSubmit={handleSearch} className="flex flex-1 gap-2">
              <div className="relative flex-1">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder={t('services.searchPlaceholder')}
                  className="pl-9 h-10 bg-white/5 border-white/10 text-white placeholder:text-white/40 text-sm"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleUseCurrentLocation}
                disabled={isLocating}
                className="h-10 border-white/20 hover:bg-white/10 whitespace-nowrap px-3"
              >
                {isLocating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <MapPin className="w-4 h-4" />
                )}
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                size="sm"
                className="h-10 px-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </Button>
            </form>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSearchParams(!showSearchParams)}
              className="h-10 px-3 text-white/60 hover:text-white"
            >
              <Filter className="w-4 h-4" />
            </Button>

            <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('list')}
                className={`h-7 px-2 ${viewMode === 'list' ? 'bg-white/10 text-white' : 'text-white/60'}`}
              >
                {t('services.viewList')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('split')}
                className={`h-7 px-2 ${viewMode === 'split' ? 'bg-white/10 text-white' : 'text-white/60'}`}
              >
                {t('services.viewSplit')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('map')}
                className={`h-7 px-2 ${viewMode === 'map' ? 'bg-white/10 text-white' : 'text-white/60'}`}
              >
                {t('services.viewMap')}
              </Button>
            </div>
          </div>

          {/* Collapsible filters section */}
          <AnimatePresence>
            {showSearchParams && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="pt-3 space-y-3">
                  <ServiceFilters
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onResetFilters={handleResetFilters}
                    infraCounts={serviceCounts}
                  />

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-white/40">{t('services.showLabel')}</span>
                    
                    <Toggle
                      pressed={filters.repair}
                      onPressedChange={() => toggleFilter('repair')}
                      className={`h-8 px-2.5 text-xs ${filters.repair ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' : 'bg-white/5 text-white/60 border-white/10'} border`}
                    >
                      <Wrench className="w-3.5 h-3.5 mr-1.5" />
                      {t('services.repair')} ({serviceCounts.repair})
                    </Toggle>

                    <Toggle
                      pressed={filters.parking}
                      onPressedChange={() => toggleFilter('parking')}
                      className={`h-8 px-2.5 text-xs ${filters.parking ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-white/5 text-white/60 border-white/10'} border`}
                    >
                      <ParkingCircle className="w-3.5 h-3.5 mr-1.5" />
                      {t('services.truckStops') || 'Truck Stops'} ({serviceCounts.parking})
                    </Toggle>

                    <Toggle
                      pressed={filters.towing}
                      onPressedChange={() => toggleFilter('towing')}
                      className={`h-8 px-2.5 text-xs ${filters.towing ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-white/5 text-white/60 border-white/10'} border`}
                    >
                      <Truck className="w-3.5 h-3.5 mr-1.5" />
                      {t('services.towing') || 'Towing'} ({serviceCounts.towing})
                    </Toggle>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {services.length === 0 && listItems.length === 0 && !isLoading && !infraLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mb-6">
              <Search className="w-10 h-10 text-white/20" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">{t('services.findServices')}</h2>
            <p className="text-white/60 max-w-md mb-6">
              {t('services.findServicesDesc')}
            </p>
            <Button
              onClick={handleUseCurrentLocation}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
            >
              <MapPin className="w-4 h-4 mr-2" />
              {t('services.findServicesBtn')}
            </Button>
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-40 rounded-xl bg-white/5" />
              ))}
            </div>
            <Skeleton className="h-[600px] rounded-xl bg-white/5 hidden lg:block" />
          </div>
        ) : (
          <div className={`grid gap-6 ${
            viewMode === 'split' ? 'grid-cols-1 lg:grid-cols-2' :
            viewMode === 'list' ? 'grid-cols-1 max-w-2xl' :
            'grid-cols-1'
          }`}>
            {(viewMode === 'list' || viewMode === 'split') && (
              <div className={`space-y-4 ${viewMode === 'split' ? 'lg:max-h-[calc(100vh-180px)] lg:overflow-y-auto lg:pr-2' : ''}`}>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-white/60">
                    {listItems.length} {listItems.length !== 1 ? t('services.results') : t('services.result')}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const center = activeSearchCenter || userCoords;
                      searchServices(location, center);
                      if (center) loadInfrastructure(center, true);
                    }}
                    className="text-white/60 hover:text-white"
                  >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    {t('common.refresh')}
                  </Button>
                </div>

                {/* OEM Dealer Locator links (when truck make is known) */}
                {truck?.make && (() => {
                  const dealerLinks = resolveOEMLinks(truck.make).filter(l => l.linkType === 'dealer_locator');
                  if (dealerLinks.length === 0) return null;
                  return (
                    <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/15">
                      <p className="text-xs font-semibold text-green-400/80 mb-2">
                        Official {truck.make} Dealer Locator
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {dealerLinks.map(link => (
                          <a
                            key={link.url}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-green-400 hover:text-green-300 underline"
                          >
                            <MapPin className="w-3 h-3" />
                            {link.label}
                          </a>
                        ))}
                      </div>
                    </div>
                  );
                })()}
                
                <AnimatePresence>
                  {listItems.map((item, index) => (
                    <motion.div
                      key={`${item._listType}-${item.id}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      {item._listType === 'service' && (
                        <ServiceCard
                          service={item}
                          isSelected={selectedService?.id === item.id}
                          onClick={() => setSelectedService(item)}
                          reviews={getServiceReviews(item)}
                        />
                      )}
                      {item._listType === 'truck_parking' && (
                        <TruckParkingCard
                          parking={item}
                          isSelected={selectedService?.id === item.id}
                          onClick={() => setSelectedService(item)}
                        />
                      )}
                      {item._listType === 'weigh_station' && (
                        <WeighStationCard
                          station={item}
                          isSelected={selectedService?.id === item.id}
                          onClick={() => setSelectedService(item)}
                        />
                      )}
                      {item._listType === 'truck_restriction' && (
                        <TruckRestrictionCard
                          restriction={item}
                          isSelected={selectedService?.id === item.id}
                          onClick={() => setSelectedService(item)}
                        />
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

            {(viewMode === 'map' || viewMode === 'split') && (
              <div className={`${viewMode === 'map' ? 'h-[calc(100vh-180px)]' : 'h-[calc(100vh-200px)] lg:sticky lg:top-28'}`}>
                <ServiceMap
                  services={filteredServices}
                  userLocation={userCoords}
                  selectedService={selectedService}
                  onSelectService={setSelectedService}
                  filters={filters}
                  truckParking={infraData.parking}
                  weighStations={infraData.weighStations}
                  restrictions={infraData.restrictions}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
