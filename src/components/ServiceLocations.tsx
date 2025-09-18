import { getErrorMessage } from "../utils/error-handling";
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  MapPin, 
  Navigation, 
  Phone, 
  Clock, 
  Star,
  Search,
  Route,
  Zap,
  Truck,
  Wrench,
  Shield,
  DollarSign,
  Package,
  ShoppingCart,
  Crosshair,
  Info,
  AlertTriangle
} from 'lucide-react';
import { GoogleMap } from './GoogleMap';
import { ErrorBoundary } from './ErrorBoundary';
import { DEBUG, ENV_CHECK } from '../utils/debug';

// Helper functions for calculations
const calculateDistance = (from: { lat: number; lng: number } | null, to: { lat: number; lng: number }): string => {
  if (!from) return 'N/A';
  
  const R = 3959; // Earth's radius in miles
  const dLat = (to.lat - from.lat) * Math.PI / 180;
  const dLng = (to.lng - from.lng) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(from.lat * Math.PI / 180) * Math.cos(to.lat * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return `${distance.toFixed(1)} miles`;
};

const calculateDriveTime = (from: { lat: number; lng: number } | null, to: { lat: number; lng: number }): string => {
  if (!from) return 'N/A';
  
  const distance = parseFloat(calculateDistance(from, to));
  const avgSpeed = 35; // Average city driving speed
  const timeInHours = distance / avgSpeed;
  const minutes = Math.round(timeInHours * 60);
  
  return `${minutes} min drive`;
};

export function ServiceLocations() {
  const [searchLocation, setSearchLocation] = useState('');
  const [selectedService, setSelectedService] = useState<number | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Get user location with enhanced error handling
  const getCurrentLocation = () => {
    setLocationError(null);
    
    // Check if geolocation is supported
    if (!navigator.geolocation) {
      const message = 'Geolocation is not supported by this browser. Using default Houston location.';
      DEBUG.info(message);
      setLocationError(message);
      setUserLocation({ lat: 29.7604, lng: -95.3698 });
      return;
    }

    // Check for HTTPS or localhost (required for geolocation in modern browsers)
    const isSecure = location.protocol === 'https:' || location.hostname === 'localhost';
    if (!isSecure) {
      const message = 'Geolocation requires HTTPS connection. Using default Houston location.';
      DEBUG.warn(message);
      setLocationError(message);
      setUserLocation({ lat: 29.7604, lng: -95.3698 });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        DEBUG.info('Location obtained successfully:', {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setLocationError(null);
      },
      (error) => {
        // Enhanced error logging with detailed information
        DEBUG.error('Geolocation error details:', {
          code: error.code,
          message: getErrorMessage(error),
          PERMISSION_DENIED: error.PERMISSION_DENIED,
          POSITION_UNAVAILABLE: error.POSITION_UNAVAILABLE,
          TIMEOUT: error.TIMEOUT
        });
        
        let errorMessage = 'Location not available: ';
        
        switch(error.code) {
          case error.PERMISSION_DENIED:
            if (getErrorMessage(error) && getErrorMessage(error).includes('permissions policy')) {
              errorMessage += 'Location access is disabled by the browser or website policy. This is common in embedded frames.';
            } else {
              errorMessage += 'Location access was denied. Please allow location access and try again.';
            }
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += 'Location information is unavailable. Please check your GPS/network connection.';
            break;
          case error.TIMEOUT:
            errorMessage += 'Location request timed out. Please try again or check your connection.';
            break;
          default:
            errorMessage += `Unknown error (${error.code}): ${getErrorMessage(error) || 'No additional details available'}.`;
            break;
        }
        
        errorMessage += ' Using Houston downtown as default location.';
        setLocationError(errorMessage);
        
        // Always provide a fallback location
        setUserLocation({ lat: 29.7604, lng: -95.3698 });
      },
      {
        enableHighAccuracy: false, // Reduce accuracy for better compatibility
        timeout: 8000, // Reduce timeout
        maximumAge: 300000 // 5 minutes cache
      }
    );
  };

  useEffect(() => {
    ENV_CHECK.safeInit('ServiceLocations', () => {
      // Set default location first, then try to get actual location
      const defaultLoc = { lat: 29.7604, lng: -95.3698 };
      setUserLocation(defaultLoc);
      getCurrentLocation();
      
      // Load nearby services for default location
      loadNearbyServices(defaultLoc);
    });
  }, []);

  // Update services when user location changes
  useEffect(() => {
    if (userLocation) {
      loadNearbyServices(userLocation);
    }
  }, [userLocation]);

  // Enhanced service centers data integrated with real service patterns
  const getDefaultServiceCenters = (location: { lat: number; lng: number }) => [
    {
      id: 1,
      name: 'TruckMaster Repair Center',
      address: '1245 Industrial Blvd, Houston, TX 77032',
      lat: 29.7704,
      lng: -95.3598,
      type: 'repair' as const,
      distance: calculateDistance(location, { lat: 29.7704, lng: -95.3598 }),
      rating: 4.8,
      reviews: 156,
      services: ['Engine Repair', 'Brake Service', 'Transmission', 'Electrical'],
      phone: '(713) 555-0123',
      hours: 'Mon-Fri: 6AM-10PM, Sat-Sun: 8AM-6PM',
      specialties: ['Heavy Duty', '24/7 Emergency'],
      estimatedTime: calculateDriveTime(location, { lat: 29.7704, lng: -95.3598 }),
      available: true,
      pricing: {
        laborRate: '$120/hr',
        diagnosticFee: '$150',
        commonRepairs: {
          brake: { service: '$450-650', newPart: '$280-420', ebayPart: '$150-280' },
          engine: { service: '$800-1200', newPart: '$1200-2400', ebayPart: '$600-1500' },
          transmission: { service: '$1200-2000', newPart: '$3000-5000', ebayPart: '$1500-3000' }
        }
      }
    },
    {
      id: 2,
      name: 'Highway Express Service',
      address: '890 Freeway Dr, Houston, TX 77015',
      lat: 29.7372,
      lng: -95.2618,
      type: 'repair' as const,
      distance: '2.1 miles',
      rating: 4.6,
      reviews: 89,
      services: ['Oil Change', 'Tires', 'Diagnostics', 'Preventive Maintenance'],
      phone: '(713) 555-0189',
      hours: 'Mon-Fri: 7AM-8PM, Sat: 8AM-5PM',
      specialties: ['Quick Service', 'Fleet Maintenance'],
      estimatedTime: '22 min drive',
      available: true,
      pricing: {
        laborRate: '$95/hr',
        diagnosticFee: '$120',
        commonRepairs: {
          brake: { service: '$380-550', newPart: '$240-380', ebayPart: '$120-240' },
          engine: { service: '$650-950', newPart: '$800-1800', ebayPart: '$400-1200' },
          transmission: { service: '$950-1600', newPart: '$2200-4000', ebayPart: '$1100-2500' }
        }
      }
    },
    {
      id: 3,
      name: 'Metro Truck Solutions',
      address: '567 Commerce St, Houston, TX 77002',
      lat: 29.7633,
      lng: -95.3632,
      type: 'repair' as const,
      distance: '3.4 miles',
      rating: 4.9,
      reviews: 234,
      services: ['Complete Overhaul', 'Fabrication', 'Paint & Body', 'Parts'],
      phone: '(713) 555-0567',
      hours: 'Mon-Fri: 6AM-9PM, Sat: 7AM-4PM',
      specialties: ['Certified Dealer', 'Warranty Work'],
      estimatedTime: '28 min drive',
      available: false,
      pricing: {
        laborRate: '$150/hr',
        diagnosticFee: '$200',
        commonRepairs: {
          brake: { service: '$550-750', newPart: '$350-520', ebayPart: '$180-320' },
          engine: { service: '$1000-1500', newPart: '$1500-3200', ebayPart: '$750-2000' },
          transmission: { service: '$1500-2500', newPart: '$3500-6000', ebayPart: '$1800-3500' }
        }
      }
    }
  ];

  // Define mock parts suppliers data
  const mockPartsSuppliers = [
    {
      id: 5,
      name: 'Houston Truck Parts',
      address: '2100 Navigation Blvd, Houston, TX 77003',
      lat: 29.7511,
      lng: -95.3447,
      type: 'parts' as const,
      distance: '1.2 miles',
      phone: '(713) 555-PARTS',
      rating: 4.5,
      services: ['OEM Parts', 'Same Day Delivery'],
      specialties: ['OEM Parts', 'Same Day Delivery'],
      inventory: 'High',
      hours: 'Mon-Fri: 7AM-7PM, Sat: 8AM-4PM',
      available: true,
      pricing: {
        markup: '15-25% over cost',
        delivery: '$25 same-day',
        commonParts: {
          brakepad: { oem: '$85-150', aftermarket: '$45-85', ebay: '$25-60' },
          filter: { oem: '$25-45', aftermarket: '$15-30', ebay: '$8-20' },
          battery: { oem: '$180-280', aftermarket: '$120-200', ebay: '$80-150' },
          alternator: { oem: '$420-680', aftermarket: '$250-420', ebay: '$150-300' }
        }
      }
    },
    {
      id: 6,
      name: 'Fleet Supply Solutions',
      address: '456 Industrial Way, Houston, TX 77020',
      lat: 29.7328,
      lng: -95.3089,
      type: 'parts' as const,
      distance: '2.8 miles',
      phone: '(713) 555-FLEET',
      rating: 4.3,
      services: ['Bulk Orders', 'Fleet Discounts'],
      specialties: ['Bulk Orders', 'Fleet Discounts'],
      inventory: 'Medium',
      hours: 'Mon-Fri: 6AM-6PM',
      available: true,
      pricing: {
        markup: '10-20% over cost',
        delivery: '$35 same-day',
        commonParts: {
          brakepad: { oem: '$90-160', aftermarket: '$50-90', ebay: '$30-65' },
          filter: { oem: '$30-50', aftermarket: '$18-35', ebay: '$10-25' },
          battery: { oem: '$200-300', aftermarket: '$140-220', ebay: '$90-170' },
          alternator: { oem: '$450-720', aftermarket: '$280-450', ebay: '$180-350' }
        }
      }
    }
  ];

  // Define mock towing services data
  const mockTowingServices = [
    {
      id: 7,
      name: 'Houston Heavy Duty Towing',
      address: '3400 Airline Dr, Houston, TX 77022',
      lat: 29.8011,
      lng: -95.3556,
      type: 'towing' as const,
      distance: '4.2 miles',
      phone: '(713) 555-TOWS',
      rating: 4.4,
      services: ['Heavy Duty Towing', 'Equipment Transport', 'Recovery'],
      specialties: ['24/7 Service', 'Heavy Equipment'],
      hours: '24/7 Available',
      available: true,
    },
    {
      id: 8,
      name: 'Express Roadside Assistance',
      address: '5200 Westheimer Rd, Houston, TX 77056',
      lat: 29.7370,
      lng: -95.4284,
      type: 'towing' as const,
      distance: '6.1 miles',
      phone: '(713) 555-ROAD',
      rating: 4.6,
      services: ['Quick Response', 'Jump Start', 'Lockout Service', 'Tire Change'],
      specialties: ['Fast Response', 'Interstate Coverage'],
      hours: '24/7 Available',
      available: true,
    }
  ];

  /**
   * Calculate distance between two points using Haversine formula
   */
  const calculateDistance = (point1: { lat: number; lng: number }, point2: { lat: number; lng: number }): string => {
    const R = 3959; // Earth's radius in miles
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLng = (point2.lng - point1.lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return `${distance.toFixed(1)} miles`;
  };

  /**
   * Calculate real-time pricing based on location and service type
   */
  const calculateRealPricing = async (serviceType: string, location: { lat: number; lng: number }) => {
    // Simulate pricing API call
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const basePricing = {
      repair: {
        laborRate: '$120/hr',
        diagnosticFee: '$150',
        commonRepairs: {
          brake: { service: '$450-650', newPart: '$280-420', ebayPart: '$150-280' },
          engine: { service: '$800-1200', newPart: '$1200-2500', ebayPart: '$600-1500' },
          transmission: { service: '$1200-2000', newPart: '$3000-5000', ebayPart: '$1500-3000' }
        }
      },
      towing: {
        baseRate: '$180-250',
        perMile: '$4-6',
        emergency: '$300-500'
      },
      parts: {
        markup: '15-25% over cost',
        delivery: '$25 same-day',
        commonParts: {
          brakepad: { oem: '$85-150', aftermarket: '$45-85', ebay: '$25-60' },
          filter: { oem: '$25-45', aftermarket: '$15-30', ebay: '$8-20' },
          battery: { oem: '$180-280', aftermarket: '$120-200', ebay: '$80-150' }
        }
      }
    };
    
    return basePricing[serviceType] || basePricing.repair;
  };


  const handleGetDirections = (address: string) => {
    // Open Google Maps directions
    const encodedAddress = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`, '_blank');
  };

  const handleCallService = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  // Real service centers will be loaded from Google Places API
  const [serviceLocations, setServiceLocations] = useState([]);
  const [isLoadingServices, setIsLoadingServices] = useState(false);

  // Load real service locations using Enhanced Service Locator
  const loadNearbyServices = async (location: { lat: number; lng: number }) => {
    setIsLoadingServices(true);
    try {
      const { default: enhancedServiceLocator } = await import('../services/EnhancedServiceLocatorService');
      const realServices = await enhancedServiceLocator.getServiceCenters(location);
      
      // Convert to the format expected by the component
      const convertedServices = realServices.map(service => ({
        ...service,
        distance: service.distance || calculateDistance(location, { lat: service.lat, lng: service.lng }),
        estimatedTime: service.estimatedTime || calculateDriveTime(location, { lat: service.lat, lng: service.lng })
      }));
      
      setServiceLocations(convertedServices);
      DEBUG.info(`Loaded ${convertedServices.length} real service locations`);
    } catch (error) {
      console.error('Error loading enhanced services:', error);
      // Fallback to default services
      setServiceLocations(getDefaultServiceCenters(location));
    } finally {
      setIsLoadingServices(false);
    }
  };

  // Search for real truck services using Google Places API
  const searchNearbyTruckServices = async (location: { lat: number; lng: number }) => {
    const services = [];
    
    try {
      // Check if Google Places API is available
      if (window.google && window.google.maps && window.google.maps.places) {
        const searchResults = await performRealGooglePlacesSearch(location);
        if (searchResults.length > 0) {
          services.push(...searchResults);
          DEBUG.info(`Found ${searchResults.length} real services via Google Places API`);
          return services;
        }
      }
      
      // Fallback to enhanced simulation with real location data
      const searchTypes = [
        'truck repair',
        'diesel repair', 
        'heavy duty repair',
        'truck parts',
        'towing service'
      ];
      
      for (const searchType of searchTypes) {
        try {
          const searchResults = await simulateGooglePlacesSearch(location, searchType);
          services.push(...searchResults);
        } catch (searchError) {
          console.warn(`Search failed for ${searchType}:`, searchError);
        }
      }
      
      return services;
    } catch (error) {
      console.error('Places search failed:', error);
      return getDefaultServiceCenters(location);
    }
  };

  // Real Google Places API search implementation
  const performRealGooglePlacesSearch = async (location: { lat: number; lng: number }) => {
    return new Promise((resolve, reject) => {
      if (!window.google?.maps?.places) {
        reject(new Error('Google Places API not available'));
        return;
      }

      const map = new window.google.maps.Map(document.createElement('div'));
      const service = new window.google.maps.places.PlacesService(map);
      
      const searchQueries = [
        'truck repair near me',
        'diesel mechanic',
        'heavy duty truck service',
        'truck parts',
        'towing service'
      ];

      const allResults = [];
      let completedSearches = 0;

      searchQueries.forEach(query => {
        const request = {
          query,
          location: new window.google.maps.LatLng(location.lat, location.lng),
          radius: 50000, // 50km radius
          type: ['establishment']
        };

        service.textSearch(request, (results, status) => {
          completedSearches++;
          
          if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
            const formattedResults = results.slice(0, 3).map((place, index) => {
              return {
                id: place.place_id || `real_${Date.now()}_${index}`,
                name: place.name || 'Unknown Service',
                address: place.formatted_address || 'Address not available',
                lat: place.geometry?.location?.lat() || location.lat,
                lng: place.geometry?.location?.lng() || location.lng,
                type: determineServiceType(place.name, place.types),
                distance: calculateDistance(location, {
                  lat: place.geometry?.location?.lat() || location.lat,
                  lng: place.geometry?.location?.lng() || location.lng
                }),
                rating: place.rating || 4.0,
                reviews: place.user_ratings_total || 0,
                services: extractServicesFromPlace(place),
                phone: place.formatted_phone_number || '(555) 000-0000',
                hours: formatBusinessHours(place.opening_hours),
                specialties: extractSpecialties(place.name, place.types),
                estimatedTime: estimateArrivalTime(location, {
                  lat: place.geometry?.location?.lat() || location.lat,
                  lng: place.geometry?.location?.lng() || location.lng
                }),
                available: true,
                pricing: generatePricingFromPlace(place)
              };
            });
            
            allResults.push(...formattedResults);
          }

          // When all searches complete, resolve with results
          if (completedSearches >= searchQueries.length) {
            // Remove duplicates and sort by distance
            const uniqueResults = removeDuplicateServices(allResults);
            const sortedResults = uniqueResults.sort((a, b) => {
              const distA = parseFloat(a.distance.replace(' miles', ''));
              const distB = parseFloat(b.distance.replace(' miles', ''));
              return distA - distB;
            });
            
            resolve(sortedResults.slice(0, 8)); // Return top 8 results
          }
        });
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        if (completedSearches < searchQueries.length) {
          resolve(allResults);
        }
      }, 10000);
    });
  };

  // Helper functions for real Google Places API
  const determineServiceType = (name: string, types: string[]): 'repair' | 'parts' | 'towing' => {
    const nameAndTypes = (name + ' ' + types.join(' ')).toLowerCase();
    
    // Towing and recovery services
    if (nameAndTypes.includes('tow') || 
        nameAndTypes.includes('wreck') || 
        nameAndTypes.includes('recovery') || 
        nameAndTypes.includes('roadside') ||
        nameAndTypes.includes('emergency assistance')) {
      return 'towing';
    } 
    // Parts suppliers and warehouses
    else if (nameAndTypes.includes('parts') || 
             nameAndTypes.includes('supply') ||
             nameAndTypes.includes('warehouse') ||
             nameAndTypes.includes('distributor') ||
             nameAndTypes.includes('auto parts') ||
             nameAndTypes.includes('truck parts')) {
      return 'parts';
    } 
    // Repair shops, workshops, garages
    else {
      return 'repair';
    }
  };

  const extractServicesFromPlace = (place: any): string[] => {
    const name = place.name?.toLowerCase() || '';
    const types = place.types?.join(' ').toLowerCase() || '';
    const combined = name + ' ' + types;
    
    const services = [];
    
    // Engine and powertrain services
    if (combined.includes('diesel')) services.push('Diesel Repair');
    if (combined.includes('engine')) services.push('Engine Repair');
    if (combined.includes('transmission')) services.push('Transmission');
    if (combined.includes('clutch')) services.push('Clutch Service');
    if (combined.includes('turbo')) services.push('Turbo Repair');
    
    // Brake and suspension
    if (combined.includes('brake')) services.push('Brake Service');
    if (combined.includes('suspension')) services.push('Suspension');
    if (combined.includes('alignment')) services.push('Wheel Alignment');
    
    // Tire services
    if (combined.includes('tire')) services.push('Tire Service');
    if (combined.includes('wheel')) services.push('Wheel Service');
    
    // Electrical and electronic
    if (combined.includes('electric')) services.push('Electrical');
    if (combined.includes('battery')) services.push('Battery Service');
    if (combined.includes('alternator')) services.push('Alternator');
    if (combined.includes('starter')) services.push('Starter Motor');
    
    // Maintenance services
    if (combined.includes('oil')) services.push('Oil Change');
    if (combined.includes('filter')) services.push('Filter Replacement');
    if (combined.includes('maintenance')) services.push('Preventive Maintenance');
    if (combined.includes('inspection')) services.push('Safety Inspection');
    
    // Specialized truck services
    if (combined.includes('air brake')) services.push('Air Brake System');
    if (combined.includes('hydraulic')) services.push('Hydraulic Systems');
    if (combined.includes('exhaust')) services.push('Exhaust Systems');
    if (combined.includes('cooling')) services.push('Cooling System');
    if (combined.includes('fuel')) services.push('Fuel System');
    
    // Body and structural
    if (combined.includes('body')) services.push('Body Repair');
    if (combined.includes('paint')) services.push('Paint & Body');
    if (combined.includes('welding')) services.push('Welding');
    if (combined.includes('frame')) services.push('Frame Repair');
    
    // Emergency and towing
    if (combined.includes('tow')) services.push('Towing');
    if (combined.includes('recovery')) services.push('Recovery Service');
    if (combined.includes('roadside')) services.push('Roadside Assistance');
    if (combined.includes('emergency')) services.push('Emergency Service');
    
    // Parts and sales
    if (combined.includes('parts')) services.push('Parts Sales');
    if (combined.includes('supply')) services.push('Parts Supply');
    if (combined.includes('warehouse')) services.push('Parts Warehouse');
    
    // Workshop types
    if (combined.includes('workshop')) services.push('Workshop Service');
    if (combined.includes('garage')) services.push('Garage Service');
    if (combined.includes('mechanic')) services.push('Mechanical Service');
    if (combined.includes('auto')) services.push('Automotive Service');
    
    return services.length > 0 ? services : ['General Repair'];
  };

  const extractSpecialties = (name: string, types: string[]): string[] => {
    const nameAndTypes = (name + ' ' + types.join(' ')).toLowerCase();
    const specialties = [];
    
    // Service availability
    if (nameAndTypes.includes('24') || nameAndTypes.includes('emergency')) {
      specialties.push('24/7 Service');
    }
    if (nameAndTypes.includes('mobile')) {
      specialties.push('Mobile Service');
    }
    
    // Vehicle type specialization
    if (nameAndTypes.includes('heavy') || nameAndTypes.includes('truck')) {
      specialties.push('Heavy Duty');
    }
    if (nameAndTypes.includes('fleet')) {
      specialties.push('Fleet Service');
    }
    if (nameAndTypes.includes('commercial')) {
      specialties.push('Commercial Vehicles');
    }
    
    // Certifications and quality
    if (nameAndTypes.includes('certified') || nameAndTypes.includes('authorized')) {
      specialties.push('Certified');
    }
    if (nameAndTypes.includes('warranty')) {
      specialties.push('Warranty Work');
    }
    if (nameAndTypes.includes('oem') || nameAndTypes.includes('genuine')) {
      specialties.push('OEM Parts');
    }
    
    // Special services
    if (nameAndTypes.includes('diagnostic')) {
      specialties.push('Diagnostic Services');
    }
    if (nameAndTypes.includes('custom')) {
      specialties.push('Custom Work');
    }
    if (nameAndTypes.includes('performance')) {
      specialties.push('Performance Tuning');
    }
    if (nameAndTypes.includes('fabrication')) {
      specialties.push('Custom Fabrication');
    }
    
    // Workshop types
    if (nameAndTypes.includes('workshop')) {
      specialties.push('Full Service Workshop');
    }
    if (nameAndTypes.includes('garage')) {
      specialties.push('Professional Garage');
    }
    
    return specialties.length > 0 ? specialties : ['Professional Service'];
  };

  const formatBusinessHours = (openingHours: any): string => {
    if (!openingHours || !openingHours.weekday_text) {
      return 'Hours not available';
    }
    
    // Return simplified hours format
    const today = openingHours.weekday_text[new Date().getDay()];
    return today || 'Hours vary';
  };

  const estimateArrivalTime = (from: { lat: number; lng: number }, to: { lat: number; lng: number }): string => {
    const distance = parseFloat(calculateDistance(from, to).replace(' miles', ''));
    const estimatedMinutes = Math.round(distance * 2.5); // Rough estimate: 2.5 minutes per mile
    
    if (estimatedMinutes < 60) {
      return `${estimatedMinutes} min drive`;
    } else {
      const hours = Math.floor(estimatedMinutes / 60);
      const minutes = estimatedMinutes % 60;
      return `${hours}h ${minutes}m drive`;
    }
  };

  const generatePricingFromPlace = (place: any) => {
    // Generate realistic pricing based on place rating and type
    const baseMultiplier = place.rating > 4.5 ? 1.2 : place.rating < 3.5 ? 0.8 : 1.0;
    
    return {
      laborRate: `$${Math.round(95 * baseMultiplier)}-${Math.round(140 * baseMultiplier)}/hr`,
      diagnosticFee: `$${Math.round(120 * baseMultiplier)}-${Math.round(180 * baseMultiplier)}`,
      commonRepairs: {
        brake: { 
          service: `$${Math.round(350 * baseMultiplier)}-${Math.round(650 * baseMultiplier)}`,
          newPart: `$${Math.round(250 * baseMultiplier)}-${Math.round(420 * baseMultiplier)}`,
          ebayPart: `$${Math.round(150 * baseMultiplier)}-${Math.round(280 * baseMultiplier)}`
        },
        engine: { 
          service: `$${Math.round(700 * baseMultiplier)}-${Math.round(1200 * baseMultiplier)}`,
          newPart: `$${Math.round(1000 * baseMultiplier)}-${Math.round(2500 * baseMultiplier)}`,
          ebayPart: `$${Math.round(500 * baseMultiplier)}-${Math.round(1500 * baseMultiplier)}`
        },
        transmission: { 
          service: `$${Math.round(1000 * baseMultiplier)}-${Math.round(2000 * baseMultiplier)}`,
          newPart: `$${Math.round(2500 * baseMultiplier)}-${Math.round(5000 * baseMultiplier)}`,
          ebayPart: `$${Math.round(1200 * baseMultiplier)}-${Math.round(3000 * baseMultiplier)}`
        }
      }
    };
  };

  const removeDuplicateServices = (services: any[]): any[] => {
    const seen = new Set();
    return services.filter(service => {
      const key = service.name + service.address;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  };

  // Simulate Google Places API search with realistic results
  const simulateGooglePlacesSearch = async (location: { lat: number; lng: number }, searchType: string) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const baseServices = [
      {
        id: 1,
        name: 'TruckMaster Repair Center',
        address: '1245 Industrial Blvd, Houston, TX 77032',
        lat: location.lat + 0.01,
        lng: location.lng + 0.01,
        type: 'repair' as const,
        distance: calculateDistance(location, { lat: location.lat + 0.01, lng: location.lng + 0.01 }),
        rating: 4.8,
        reviews: 156,
        services: ['Engine Repair', 'Brake Service', 'Transmission', 'Electrical'],
        phone: '(713) 555-0123',
        hours: 'Mon-Fri: 6AM-10PM, Sat-Sun: 8AM-6PM',
        specialties: ['Heavy Duty', '24/7 Emergency'],
        estimatedTime: '15 min drive',
        available: true,
        pricing: await calculateRealPricing('repair', location)
      },
    {
      id: 2,
      name: 'Highway Express Service',
      address: '890 Freeway Dr, Houston, TX 77015',
      lat: 29.7372,
      lng: -95.2618,
      type: 'repair' as const,
      distance: '2.1 miles',
      rating: 4.6,
      reviews: 89,
      services: ['Oil Change', 'Tires', 'Diagnostics', 'Preventive Maintenance'],
      phone: '(713) 555-0189',
      hours: 'Mon-Fri: 7AM-8PM, Sat: 8AM-5PM',
      specialties: ['Quick Service', 'Fleet Maintenance'],
      estimatedTime: '22 min drive',
      available: true,
      pricing: {
        laborRate: '$95/hr',
        diagnosticFee: '$120',
        commonRepairs: {
          brake: { service: '$380-550', newPart: '$240-380', ebayPart: '$120-240' },
          engine: { service: '$650-950', newPart: '$800-1800', ebayPart: '$400-1200' },
          transmission: { service: '$950-1600', newPart: '$2200-4000', ebayPart: '$1100-2500' }
        }
      }
    },
    {
      id: 3,
      name: 'Metro Truck Solutions',
      address: '567 Commerce St, Houston, TX 77002',
      lat: 29.7633,
      lng: -95.3632,
      type: 'repair' as const,
      distance: '3.4 miles',
      rating: 4.9,
      reviews: 234,
      services: ['Complete Overhaul', 'Fabrication', 'Paint & Body', 'Parts'],
      phone: '(713) 555-0567',
      hours: 'Mon-Fri: 6AM-9PM, Sat: 7AM-4PM',
      specialties: ['Certified Dealer', 'Warranty Work'],
      estimatedTime: '28 min drive',
      available: false,
      pricing: {
        laborRate: '$150/hr',
        diagnosticFee: '$200',
        commonRepairs: {
          brake: { service: '$550-750', newPart: '$350-520', ebayPart: '$180-320' },
          engine: { service: '$1000-1500', newPart: '$1500-3200', ebayPart: '$750-2000' },
          transmission: { service: '$1500-2500', newPart: '$3500-6000', ebayPart: '$1800-3500' }
        }
      }
    },
    {
      id: 4,
      name: '24/7 Emergency Mobile Service',
      address: 'Mobile Service - Covers Houston Metro Area',
      lat: 29.7604,
      lng: -95.3698,
      type: 'towing' as const,
      distance: 'On-demand',
      rating: 4.7,
      reviews: 78,
      services: ['Roadside Repair', 'Jump Start', 'Tire Change', 'Towing'],
      phone: '(713) 555-HELP',
      hours: '24/7 Available',
      specialties: ['Mobile Service', 'Emergency Response'],
      estimatedTime: '30-45 min response',
      available: true,
      pricing: {
        laborRate: '$140/hr',
        diagnosticFee: '$180',
        commonRepairs: {
          roadside: { service: '$200-400', emergency: '$300-600', towing: '$150-300' },
          jumpStart: { service: '$80-120', battery: '$120-250', ebayBattery: '$60-150' },
          tireChange: { service: '$100-200', newTire: '$200-400', usedTire: '$80-180' }
        }
      }
    }
  ];

    return baseServices;
  };

  // Combine all locations for map - prioritize real data from serviceLocations if available
  const allLocations = serviceLocations.length > 0 ? 
    serviceLocations : [
      ...mockServiceCenters,
      ...mockPartsSuppliers,
      ...mockTowingServices
    ];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="rounded-2xl p-4 md:p-6 border border-white/20 backdrop-blur-xl" style={{
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)'
      }}>
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Emergency Services & Repair Costs</h2>
        <p className="text-white/90 text-sm md:text-base leading-relaxed">
          Find help fast with instant cost estimates. Know before you go - repair prices, parts costs, and tow truck contacts.
        </p>
      </div>

      {/* Search and Filter */}
      <Card className="border-glass-border" style={{
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)'
      }}>
        <CardContent className="pt-6">
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <Input
                placeholder="Enter location or use current location..."
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
                className="w-full"
              />
            </div>
            <Button>
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
            <Button variant="outline" onClick={getCurrentLocation}>
              <Crosshair className="h-4 w-4 mr-2" />
              My Location
            </Button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="cursor-pointer border-white/20 text-white/90 hover:bg-white/10 hover:text-white">24/7 Available</Badge>
            <Badge variant="outline" className="cursor-pointer border-white/20 text-white/90 hover:bg-white/10 hover:text-white">Mobile Service</Badge>
            <Badge variant="outline" className="cursor-pointer border-white/20 text-white/90 hover:bg-white/10 hover:text-white">Emergency</Badge>
            <Badge variant="outline" className="cursor-pointer border-white/20 text-white/90 hover:bg-white/10 hover:text-white">Certified</Badge>
            <Badge variant="outline" className="cursor-pointer border-white/20 text-white/90 hover:bg-white/10 hover:text-white">Under 5 miles</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Interactive Map */}
      <Card className="border-glass-border" style={{
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)'
      }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <MapPin className="h-5 w-5" />
            Service Locations Map
          </CardTitle>
          <CardDescription className="text-white/80">
            Interactive map showing repair shops, parts suppliers, and tow services in your area
          </CardDescription>
        </CardHeader>
        <CardContent>
          {locationError && (
            <div className="mb-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-orange-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-orange-300 text-sm">{locationError}</p>
                <p className="text-orange-300/70 text-xs mt-1">
                  Maps will still work using the default Houston location.
                </p>
              </div>
            </div>
          )}
          
          {/* Maps API Status Notice */}
          <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-400" />
                <p className="text-blue-300 text-sm">
                  Maps integration ready - configure API key for full functionality
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Navigate to maps test page by updating the active tab
                  const event = new CustomEvent('navigate-to-maps-test');
                  window.dispatchEvent(event);
                }}
                className="glass-subtle border-white/20 text-white hover:bg-white/10 text-xs"
              >
                Test & Setup
              </Button>
            </div>
          </div>
          
          <ErrorBoundary fallback={
            <div className="h-64 sm:h-80 md:h-96 rounded-xl border border-red-500/20 bg-red-500/5 flex items-center justify-center">
              <div className="text-center p-4">
                <AlertTriangle className="h-8 w-8 text-red-400 mx-auto mb-2" />
                <p className="text-red-300 text-sm">Map failed to load</p>
                <p className="text-red-300/70 text-xs mt-1">Using fallback service list</p>
              </div>
            </div>
          }>
            <GoogleMap
              locations={allLocations}
              userLocation={userLocation}
              onLocationSelect={(location) => setSelectedService(location.id)}
              className="h-64 sm:h-80 md:h-96 rounded-xl overflow-hidden border border-white/20 shadow-2xl"
            />
          </ErrorBoundary>
          
          <div className="mt-4 flex flex-wrap gap-2 justify-center">
            <Button variant="outline" size="sm" className="glass-subtle border-white/20 text-white hover:bg-white/10">
              <Navigation className="h-4 w-4 mr-2" />
              Get Directions
            </Button>
            <Button variant="outline" size="sm" className="glass-subtle border-white/20 text-white hover:bg-white/10">
              <MapPin className="h-4 w-4 mr-2" />
              Nearest First
            </Button>
            <Button variant="outline" size="sm" className="glass-subtle border-white/20 text-white hover:bg-white/10">
              <Star className="h-4 w-4 mr-2" />
              Highest Rated
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="services" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 glass-subtle border-white/20">
          <TabsTrigger value="services" className="data-[state=active]:bg-white/15 data-[state=active]:text-white text-white/80 hover:text-white">Repair Shops</TabsTrigger>
          <TabsTrigger value="parts" className="data-[state=active]:bg-white/15 data-[state=active]:text-white text-white/80 hover:text-white">Parts & Costs</TabsTrigger>
          <TabsTrigger value="emergency" className="data-[state=active]:bg-white/15 data-[state=active]:text-white text-white/80 hover:text-white">Tow Trucks</TabsTrigger>
        </TabsList>

        <TabsContent value="services">
          <div className="space-y-4">
            {mockServiceCenters.map((service) => (
              <Card key={service.id} className={`border-glass-border transition-all duration-300 ${selectedService === service.id ? 'ring-2 ring-primary bg-metal-silver/10' : 'hover:bg-metal-silver/5'}`} style={{
                background: 'rgba(0, 0, 0, 0.4)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)'
              }}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-white">
                        {service.name}
                        {!service.available && <Badge variant="secondary">Closed</Badge>}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1 text-white/85">
                        <MapPin className="h-4 w-4" />
                        {service.address}
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                        <span className="font-medium text-white">{service.rating}</span>
                        <span className="text-sm text-white/75">({service.reviews})</span>
                      </div>
                      <div className="text-sm text-white/75">{service.distance}</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Services */}
                    <div>
                      <h4 className="mb-2 text-white">Services</h4>
                      <div className="flex flex-wrap gap-2">
                        {service.services.map((serviceType) => (
                          <Badge key={serviceType} variant="outline" className="border-white/20 text-white/90">
                            {serviceType}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Specialties */}
                    <div>
                      <h4 className="mb-2 text-white">Specialties</h4>
                      <div className="flex flex-wrap gap-2">
                        {service.specialties.map((specialty) => (
                          <Badge key={specialty} variant="secondary" className="bg-white/10 text-white">
                            {specialty}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Contact & Hours */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-white">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        <span>{service.phone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>{service.estimatedTime}</span>
                      </div>
                    </div>
                    <div className="text-sm text-white/75">
                      {service.hours}
                    </div>

                    {/* Pricing Information */}
                    {service.pricing && (
                      <div className="p-3 glass-subtle rounded-lg border-glass-border">
                        <h4 className="flex items-center gap-2 mb-3 text-metal-silver">
                          <DollarSign className="h-4 w-4" />
                          Repair Estimates
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                          <div>
                            <div className="text-white/75 mb-1">Labor Rate:</div>
                            <div className="font-medium text-white">{service.pricing.laborRate}</div>
                          </div>
                          <div>
                            <div className="text-white/75 mb-1">Diagnostic Fee:</div>
                            <div className="font-medium text-white">{service.pricing.diagnosticFee}</div>
                          </div>
                          <div>
                            <div className="text-white/75 mb-1">Est. Response:</div>
                            <div className="font-medium text-white">{service.estimatedTime}</div>
                          </div>
                        </div>
                        
                        <div className="mt-3 space-y-2">
                          <div className="text-xs text-white/75 mb-2">Common Repair Estimates:</div>
                          {service.pricing.commonRepairs && Object.entries(service.pricing.commonRepairs).map(([repair, costs]) => (
                            <div key={repair} className="grid grid-cols-4 gap-2 text-xs">
                              <div className="font-medium capitalize text-white">{repair}:</div>
                              <div className="text-blue-400">{costs.service}</div>
                              <div className="text-green-400">{costs.newPart || costs.emergency}</div>
                              <div className="text-orange-400">{costs.ebayPart || costs.towing}</div>
                            </div>
                          ))}
                          <div className="grid grid-cols-4 gap-2 text-xs text-white/75 mt-1 pt-1 border-t border-glass-border">
                            <div></div>
                            <div>Service</div>
                            <div>New Parts</div>
                            <div>Used/eBay</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => handleGetDirections(service.address)}
                        className="flex-1"
                        disabled={!service.available}
                      >
                        <Navigation className="h-4 w-4 mr-2" />
                        Directions
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => handleCallService(service.phone)}
                        className="glass-subtle border-white/20 text-white hover:bg-white/10"
                      >
                        <Phone className="h-4 w-4 mr-2" />
                        Call
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => setSelectedService(selectedService === service.id ? null : service.id)}
                        className="glass-subtle border-white/20 text-white hover:bg-white/10"
                      >
                        Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="parts">
          <div className="space-y-4">
            {mockPartsSuppliers.map((supplier, index) => (
              <Card key={index} className="glass-strong border-glass-border hover:bg-metal-silver/5 transition-all duration-300" style={{
                background: 'rgba(0, 0, 0, 0.4)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)'
              }}>
                <CardHeader>
                  <CardTitle className="text-white">{supplier.name}</CardTitle>
                  <CardDescription className="flex items-center gap-2 text-white/85">
                    <MapPin className="h-4 w-4" />
                    {supplier.address}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="mb-2 text-white">Specialties</h4>
                      <div className="flex flex-wrap gap-2">
                        {supplier.specialties.map((specialty) => (
                          <Badge key={specialty} variant="outline" className="border-white/20 text-white/90">
                            {specialty}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-white/75">Distance:</span>
                        <div className="text-white">{supplier.distance}</div>
                      </div>
                      <div>
                        <span className="text-white/75">Inventory:</span>
                        <div className="flex items-center gap-2">
                          <span className="text-white">{supplier.inventory}</span>
                          <Badge variant={supplier.inventory === 'High' ? 'default' : 'secondary'} className="text-xs">
                            {supplier.inventory}
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <span className="text-white/75">Hours:</span>
                        <div className="text-white">{supplier.hours}</div>
                      </div>
                    </div>

                    {/* Pricing Information */}
                    {supplier.pricing && (
                      <div className="p-3 glass-subtle rounded-lg border-glass-border">
                        <h4 className="flex items-center gap-2 mb-3 text-metal-silver">
                          <ShoppingCart className="h-4 w-4" />
                          Parts Pricing Guide
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mb-3">
                          <div>
                            <div className="text-white/75 mb-1">Markup:</div>
                            <div className="font-medium text-white">{supplier.pricing.markup}</div>
                          </div>
                          <div>
                            <div className="text-white/75 mb-1">Same-Day Delivery:</div>
                            <div className="font-medium text-white">{supplier.pricing.delivery}</div>
                          </div>
                        </div>
                        
                        <div className="mt-3 space-y-2">
                          <div className="text-xs text-white/75 mb-2">Common Parts Pricing:</div>
                          {supplier.pricing.commonParts && Object.entries(supplier.pricing.commonParts).map(([part, costs]) => (
                            <div key={part} className="grid grid-cols-4 gap-2 text-xs">
                              <div className="font-medium capitalize text-white">{part}:</div>
                              <div className="text-blue-400">{costs.oem}</div>
                              <div className="text-green-400">{costs.aftermarket}</div>
                              <div className="text-orange-400">{costs.ebay}</div>
                            </div>
                          ))}
                          <div className="grid grid-cols-4 gap-2 text-xs text-white/75 mt-1 pt-1 border-t border-glass-border">
                            <div></div>
                            <div>OEM</div>
                            <div>Aftermarket</div>
                            <div>eBay/Used</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => handleGetDirections(supplier.address)}
                        className="flex-1"
                      >
                        <Navigation className="h-4 w-4 mr-2" />
                        Directions
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => handleCallService(supplier.phone)}
                        className="glass-subtle border-white/20 text-white hover:bg-white/10"
                      >
                        <Phone className="h-4 w-4 mr-2" />
                        Call
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="emergency">
          <div className="space-y-4">
            {/* Emergency Services Summary */}
            <Card className="glass-strong border-glass-border" style={{
              background: 'rgba(0, 0, 0, 0.4)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)'
            }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-metal-silver">
                  <Truck className="h-5 w-5" />
                  Emergency Services & Towing
                </CardTitle>
                <CardDescription className="text-white/80">
                  24/7 towing, roadside assistance, and emergency repair services
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="p-3 glass-subtle rounded-lg border-glass-border">
                    <Truck className="h-6 w-6 mx-auto mb-2 text-metal-silver" />
                    <div className="text-sm font-medium text-white">Towing</div>
                    <div className="text-xs text-white/75">$150-300</div>
                  </div>
                  <div className="p-3 glass-subtle rounded-lg border-glass-border">
                    <Wrench className="h-6 w-6 mx-auto mb-2 text-metal-silver" />
                    <div className="text-sm font-medium text-white">Roadside Repair</div>
                    <div className="text-xs text-white/75">$100-250</div>
                  </div>
                  <div className="p-3 glass-subtle rounded-lg border-glass-border">
                    <Zap className="h-6 w-6 mx-auto mb-2 text-metal-silver" />
                    <div className="text-sm font-medium text-white">Jump Start</div>
                    <div className="text-xs text-white/75">$80-150</div>
                  </div>
                  <div className="p-3 glass-subtle rounded-lg border-glass-border">
                    <Shield className="h-6 w-6 mx-auto mb-2 text-metal-silver" />
                    <div className="text-sm font-medium text-white">Tire Change</div>
                    <div className="text-xs text-white/75">$100-200</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Towing Services */}
            {[...mockServiceCenters.filter(s => s.type === 'towing'), ...mockTowingServices].map((service) => (
              <Card key={service.id} className={`border-glass-border transition-all duration-300 ${selectedService === service.id ? 'ring-2 ring-primary bg-metal-silver/10' : 'hover:bg-metal-silver/5'}`} style={{
                background: 'rgba(0, 0, 0, 0.4)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)'
              }}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-white">
                        <Truck className="h-5 w-5" />
                        {service.name}
                        {!service.available && <Badge variant="secondary">Unavailable</Badge>}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1 text-white/85">
                        <MapPin className="h-4 w-4" />
                        {service.address}
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                        <span className="font-medium text-white">{service.rating}</span>
                      </div>
                      <div className="text-sm text-white/75">{service.distance}</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Services */}
                    <div>
                      <h4 className="mb-2 text-white">Services</h4>
                      <div className="flex flex-wrap gap-2">
                        {service.services.map((serviceType) => (
                          <Badge key={serviceType} variant="outline" className="border-white/20 text-white/90">
                            {serviceType}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Specialties */}
                    <div>
                      <h4 className="mb-2 text-white">Specialties</h4>
                      <div className="flex flex-wrap gap-2">
                        {service.specialties.map((specialty) => (
                          <Badge key={specialty} variant="secondary" className="bg-white/10 text-white">
                            {specialty}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Contact & Response Time */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-white">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        <span>{service.phone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>{service.estimatedTime || '30-45 min response'}</span>
                      </div>
                    </div>
                    <div className="text-sm text-white/75">
                      {service.hours}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => handleGetDirections(service.address)}
                        className="flex-1"
                        disabled={!service.available}
                      >
                        <Navigation className="h-4 w-4 mr-2" />
                        Directions
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => handleCallService(service.phone)}
                        className="glass-subtle border-white/20 text-white hover:bg-white/10"
                      >
                        <Phone className="h-4 w-4 mr-2" />
                        Call
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
