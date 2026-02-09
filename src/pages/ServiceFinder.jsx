import React, { useState, useEffect } from 'react';
import { entities } from '@/services/entityService';
import { invokeLLM } from '@/services/aiService';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

import ServiceMap from '@/components/services/ServiceMap';
import ServiceCard from '@/components/services/ServiceCard';
import ServiceFilters from '@/components/services/ServiceFilters';
import { useLanguage } from '@/lib/LanguageContext';

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
  });

  const queryClient = useQueryClient();

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

  const searchServices = async (searchLocation) => {
    if (!searchLocation && !userCoords) {
      toast.error(t('services.locationRequired'));
      return;
    }

    setIsLoading(true);
    setServices([]);

    try {
      const locationQuery = searchLocation || `coordinates ${userCoords[0]}, ${userCoords[1]}`;
      
      const serviceTypesFilter = filters.serviceTypes.length > 0
        ? `Focus on services offering: ${filters.serviceTypes.map(t => {
            const typeMap = {
              engine: 'engine repair',
              electrical: 'electrical work',
              tires: 'tire service',
              brakes: 'brake repair',
              transmission: 'transmission service',
              diagnostic: 'diagnostics'
            };
            return typeMap[t];
          }).join(', ')}.`
        : '';
      
      const is24HoursFilter = filters.is24Hours ? 'Only include 24/7 services.' : '';
      const minRatingFilter = filters.minRating > 0 ? `Only include services with rating ${filters.minRating}+.` : '';

      const response = await invokeLLM({
        prompt: `CRITICAL: Use real-time search data from Google Maps, Yelp, and TruckersReport to find actual truck services near ${locationQuery} in the USA.

        SEARCH REQUIREMENTS:
        1. **Truck Repair Shops**: Search Google Maps for "truck repair near [location]", "semi truck mechanic [location]", "commercial truck service [location]"
           - Prioritize shops that explicitly service heavy-duty trucks (Class 8): Peterbilt, Kenworth, Freightliner, Volvo, Mack, International, Western Star
           - Include independent shops AND dealer service centers
           
        2. **Truck Parking & Rest Areas**: Search for "truck parking [location]", "truck stop [location]", "rest area [location]"
           - Include truck stops (Love's, Pilot Flying J, TA, Petro)
           - Public rest areas with truck parking
           - Private truck parking facilities
           
        3. **Heavy-Duty Towing**: Search for "heavy duty towing [location]", "semi truck towing [location]", "commercial towing [location]"
           - Must have equipment for Class 8 trucks (rotator wreckers, heavy-duty flatbeds)

        ${serviceTypesFilter}
        ${is24HoursFilter}
        ${minRatingFilter}

        CRITICAL DATA REQUIREMENTS:
        - Use REAL business names, addresses, and phone numbers from search results
        - Use ACTUAL ratings and review counts from Google Maps/Yelp
        - Get REAL coordinates (latitude/longitude) for accurate map placement
        - Include REAL business hours from their listings
        - For repair shops: List their actual specialties
        - Calculate accurate distance from search center
        - Verify businesses are CURRENTLY OPERATING

        Return 8-12 results total (mix of all types), sorted by distance and rating.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            services: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  name: { type: "string" },
                  type: { type: "string", enum: ["repair", "parking", "towing"] },
                  address: { type: "string" },
                  lat: { type: "number" },
                  lng: { type: "number" },
                  rating: { type: "number" },
                  reviews: { type: "number" },
                  phone: { type: "string" },
                  hours: { type: "string" },
                  is24Hours: { type: "boolean" },
                  specialties: { type: "array", items: { type: "string" } },
                  distance: { type: "number" }
                }
              }
            },
            search_center: {
              type: "object",
              properties: {
                lat: { type: "number" },
                lng: { type: "number" }
              }
            }
          }
        }
      });

      if (response.services && response.services.length > 0) {
        setServices(response.services);
        if (response.search_center) {
          setUserCoords([response.search_center.lat, response.search_center.lng]);
        }
      } else {
        toast.info(t('services.noServicesFound'));
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
      searchServices('');
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = [position.coords.latitude, position.coords.longitude];
          setUserCoords(coords);
          searchServices('');
        },
        () => {
          toast.error(t('services.locationFailed'));
        }
      );
    }
  };

  const toggleFilter = (type) => {
    setFilters(prev => ({ ...prev, [type]: !prev[type] }));
  };

  const filteredServices = services.filter(s => filters[s.type]);

  const serviceCounts = {
    repair: services.filter(s => s.type === 'repair').length,
    parking: services.filter(s => s.type === 'parking').length,
    towing: services.filter(s => s.type === 'towing').length
  };

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
        {services.length === 0 && !isLoading ? (
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
                    {filteredServices.length} {filteredServices.length !== 1 ? t('services.results') : t('services.result')}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => searchServices(location)}
                    className="text-white/60 hover:text-white"
                  >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    {t('common.refresh')}
                  </Button>
                </div>
                
                <AnimatePresence>
                  {filteredServices.map((service, index) => (
                    <motion.div
                      key={service.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <ServiceCard
                        service={service}
                        isSelected={selectedService?.id === service.id}
                        onClick={() => setSelectedService(service)}
                        reviews={allReviews.filter(r => 
                          r.service_name === service.name && 
                          r.service_address === service.address
                        )}
                      />
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
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
