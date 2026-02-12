import React, { useState, useEffect, useCallback } from 'react';
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
  List, 
  Map as MapIcon,
  RefreshCw,
  Scale,
  AlertTriangle
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
import { supabase } from '@/api/supabaseClient';

export default function ServiceFinder() {
  const { t } = useLanguage();
  const [location, setLocation] = useState('');
  const [userCoords, setUserCoords] = useState(null);
  const [services, setServices] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [viewMode, setViewMode] = useState('split');
  const [filters, setFilters] = useState({
    repair: true,
    parking: true,
    towing: true,
    serviceTypes: [],
    is24Hours: false,
    minRating: 0,
    // Infrastructure layers
    showTruckParking: true,
    showWeighStations: true,
    showRestrictions: false,
  });

  // Infrastructure data from Supabase
  const [infraData, setInfraData] = useState({ parking: [], weighStations: [], restrictions: [] });
  const [infraLoading, setInfraLoading] = useState(false);

  const { data: allReviews = [] } = useQuery({
    queryKey: ['service-reviews'],
    queryFn: () => entities.ServiceReview.list(),
    enabled: services.length > 0,
  });

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserCoords([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.log('Location access denied');
        }
      );
    }
  }, []);

  // Fetch infrastructure data whenever userCoords change and layers are enabled
  const loadInfrastructure = useCallback(async (coords) => {
    if (!coords) return;
    const anyLayerOn = filters.showTruckParking || filters.showWeighStations || filters.showRestrictions;
    if (!anyLayerOn) return;

    setInfraLoading(true);
    try {
      const data = await fetchAllInfrastructure(coords[0], coords[1], 50);
      setInfraData(data);
    } catch (err) {
      console.warn('Infrastructure fetch failed:', err);
      toast.error(t('services.infraFailed'));
    } finally {
      setInfraLoading(false);
    }
  }, [filters.showTruckParking, filters.showWeighStations, filters.showRestrictions, t]);

  // Reload infra when coords or layer toggles change
  useEffect(() => {
    if (userCoords) {
      loadInfrastructure(userCoords);
    }
  }, [userCoords, loadInfrastructure]);

  /** Geocode a text address to { lat, lng } via server-side proxy */
  const geocodeAddress = async (address) => {
    try {
      const res = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data.lat && data.lng) {
        return { lat: data.lat, lng: data.lng };
      }
    } catch (err) {
      console.warn('Geocoding failed:', err);
    }
    return null;
  };

  const searchServices = async (searchLocation, overrideCoords = null) => {
    let coords = overrideCoords || userCoords;

    // If user typed an address but we have no coords, geocode it
    if (searchLocation && !coords) {
      const geo = await geocodeAddress(searchLocation);
      if (geo) {
        coords = [geo.lat, geo.lng];
        setUserCoords(coords);
      } else {
        toast.error(t('services.locationFailed'));
        return;
      }
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
      if (filters.repair) types.push('repair');
      if (filters.parking) types.push('parking');
      if (filters.towing) types.push('towing');
      if (types.length === 0) types.push('repair', 'parking', 'towing');

      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;

      const response = await fetch('/api/places-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken && { Authorization: `Bearer ${authToken}` }),
        },
        body: JSON.stringify({
          lat: coords[0],
          lng: coords[1],
          query: searchLocation || undefined,
          types,
          radius: 40000,
        }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      let results = data.services || [];

      // Client-side filters
      if (filters.is24Hours) {
        results = results.filter(s => s.is24Hours);
      }
      if (filters.minRating > 0) {
        results = results.filter(s => s.rating >= filters.minRating);
      }

      if (results.length > 0) {
        setServices(results);
        if (data.search_center) {
          const newCoords = [data.search_center.lat, data.search_center.lng];
          setUserCoords(newCoords);
          loadInfrastructure(newCoords);
        } else {
          loadInfrastructure(coords);
        }
      } else {
        toast.info(t('services.noServicesFound'));
        if (coords) loadInfrastructure(coords);
      }
    } catch (error) {
      console.error('Error searching services:', error);
      toast.error(t('services.searchFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    searchServices(location);
  };

  const handleUseCurrentLocation = () => {
    if (userCoords) {
      searchServices('', userCoords);
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = [position.coords.latitude, position.coords.longitude];
          setUserCoords(coords);
          searchServices('', coords);
        },
        () => {
          toast.error(t('services.locationFailed'));
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
      );
    } else {
      toast.error(t('services.locationFailed'));
    }
  };

  const toggleFilter = (type) => {
    setFilters(prev => ({ ...prev, [type]: !prev[type] }));
  };

  const filteredServices = services.filter(s => filters[s.type]);

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
    ...(filters.showWeighStations ? infraData.weighStations.map(w => ({ ...w, _listType: 'weigh_station' })) : []),
    ...(filters.showRestrictions ? infraData.restrictions.map(r => ({ ...r, _listType: 'truck_restriction' })) : []),
  ];

  return (
    <div className="min-h-screen">
      <div className="bg-[#0a0a0a] border-b border-white/5 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={t('services.searchPlaceholder')}
                className="pl-10 h-12 bg-white/5 border-white/10 text-white placeholder:text-white/40"
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleUseCurrentLocation}
                className="h-12 border-white/20 hover:bg-white/10 whitespace-nowrap"
              >
                <MapPin className="w-4 h-4 mr-2" />
                {t('services.useMyLocation')}
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="h-12 px-6 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    {t('services.searchServices')}
                  </>
                )}
              </Button>
            </div>
          </form>

          <div className="mt-4">
            <ServiceFilters filters={filters} onFilterChange={setFilters} />
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-4">
            <span className="text-sm text-white/40">{t('services.showLabel')}</span>
            
            <Toggle
              pressed={filters.repair}
              onPressedChange={() => toggleFilter('repair')}
              className={`h-9 px-3 ${filters.repair ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' : 'bg-white/5 text-white/60 border-white/10'} border`}
            >
              <Wrench className="w-4 h-4 mr-2" />
              {t('services.repair')} ({serviceCounts.repair})
            </Toggle>
            
            <Toggle
              pressed={filters.parking}
              onPressedChange={() => toggleFilter('parking')}
              className={`h-9 px-3 ${filters.parking ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-white/5 text-white/60 border-white/10'} border`}
            >
              <ParkingCircle className="w-4 h-4 mr-2" />
              {t('services.parking')} ({serviceCounts.parking})
            </Toggle>
            
            <Toggle
              pressed={filters.towing}
              onPressedChange={() => toggleFilter('towing')}
              className={`h-9 px-3 ${filters.towing ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-white/5 text-white/60 border-white/10'} border`}
            >
              <Truck className="w-4 h-4 mr-2" />
              {t('services.towing')} ({serviceCounts.towing})
            </Toggle>

            <div className="w-px h-6 bg-white/10 mx-1" />
            
            <span className="text-sm text-white/40">{t('services.layers')}</span>

            <Toggle
              pressed={filters.showTruckParking}
              onPressedChange={() => toggleFilter('showTruckParking')}
              className={`h-9 px-3 ${filters.showTruckParking ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' : 'bg-white/5 text-white/60 border-white/10'} border`}
            >
              <ParkingCircle className="w-4 h-4 mr-2" />
              {t('services.truckParking')} ({serviceCounts.truckParking})
            </Toggle>

            <Toggle
              pressed={filters.showWeighStations}
              onPressedChange={() => toggleFilter('showWeighStations')}
              className={`h-9 px-3 ${filters.showWeighStations ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' : 'bg-white/5 text-white/60 border-white/10'} border`}
            >
              <Scale className="w-4 h-4 mr-2" />
              {t('services.weighStations')} ({serviceCounts.weighStations})
            </Toggle>

            <Toggle
              pressed={filters.showRestrictions}
              onPressedChange={() => toggleFilter('showRestrictions')}
              className={`h-9 px-3 ${filters.showRestrictions ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-white/5 text-white/60 border-white/10'} border`}
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              {t('services.restrictions')} ({serviceCounts.restrictions})
            </Toggle>

            <div className="ml-auto flex items-center gap-1 bg-white/5 rounded-lg p-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('list')}
                className={`h-8 px-3 ${viewMode === 'list' ? 'bg-white/10 text-white' : 'text-white/60'}`}
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('split')}
                className={`h-8 px-3 ${viewMode === 'split' ? 'bg-white/10 text-white' : 'text-white/60'}`}
              >
                {t('services.split')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('map')}
                className={`h-8 px-3 ${viewMode === 'map' ? 'bg-white/10 text-white' : 'text-white/60'}`}
              >
                <MapIcon className="w-4 h-4" />
              </Button>
            </div>
          </div>
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
              <div className={`space-y-4 ${viewMode === 'split' ? 'lg:max-h-[calc(100vh-250px)] lg:overflow-y-auto lg:pr-2' : ''}`}>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-white/60">
                    {listItems.length} {listItems.length !== 1 ? t('services.results') : t('services.result')}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { searchServices(location); loadInfrastructure(userCoords); }}
                    className="text-white/60 hover:text-white"
                  >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    {t('common.refresh')}
                  </Button>
                </div>
                
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
                          reviews={allReviews.filter(r => 
                            r.service_name === item.name && 
                            r.service_address === item.address
                          )}
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
              <div className={`${viewMode === 'map' ? 'h-[calc(100vh-250px)]' : 'h-[600px] lg:sticky lg:top-36'}`}>
                <ServiceMap
                  services={services}
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
