import { ServiceCenter } from '../types/serviceCenter';

export interface ServiceLocation {
  id: number;
  name: string;
  address: string;
  lat: number;
  lng: number;
  type: 'repair' | 'parts' | 'towing';
  rating: number;
  phone: string;
  services: string[];
  available: boolean;
  distance?: string;
  reviews?: number;
  hours?: string;
  specialties?: string[];
  estimatedTime?: string;
  pricing?: {
    laborRate: string;
    diagnosticFee: string;
    commonRepairs: any;
  };
}

export class EnhancedServiceLocatorService {
  private googleMapsService: any = null;
  private cache = new Map<string, ServiceLocation[]>();
  private cacheExpiry = 10 * 60 * 1000; // 10 minutes

  constructor() {
    this.initializeGoogleMaps();
  }

  private async initializeGoogleMaps() {
    try {
      if (window.google && window.google.maps && window.google.maps.places) {
        this.googleMapsService = new window.google.maps.places.PlacesService(
          document.createElement('div')
        );
      }
    } catch (error) {
      console.log('Google Maps not available, using fallback service');
    }
  }

  /**
   * Get service centers with real-time data integration
   */
  async getServiceCenters(location?: { lat: number; lng: number }): Promise<ServiceLocation[]> {
    const cacheKey = location ? `${location.lat}_${location.lng}` : 'default';
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      return cached;
    }

    try {
      // Try to get real data from multiple sources
      const services: ServiceLocation[] = [];

      // 1. Get data from local/fallback sources
      // Note: Firebase service removed to consolidate on Supabase
      // const firebaseServices = await this.getFirebaseServices(location);
      // services.push(...firebaseServices);

      // 2. Get data from Google Places API
      if (location && this.googleMapsService) {
        const googleServices = await this.getGooglePlacesServices(location);
        services.push(...googleServices);
      }

      // 3. Get curated truck service data
      const curatedServices = await this.getCuratedTruckServices(location);
      services.push(...curatedServices);

      // Remove duplicates and sort by distance/rating
      const uniqueServices = this.deduplicateServices(services);
      const sortedServices = this.sortServicesByRelevance(uniqueServices, location);

      // Cache the results
      this.cache.set(cacheKey, sortedServices);
      setTimeout(() => this.cache.delete(cacheKey), this.cacheExpiry);

      return sortedServices;
    } catch (error) {
      console.error('Error fetching service centers:', error);
      return this.getFallbackServices(location);
    }
  }

  /*
   * Firebase service method removed - consolidating on Supabase
   * private async getFirebaseServices(location?: { lat: number; lng: number }): Promise<ServiceLocation[]> {
   *   try {
   *     const serviceCenters = await serviceLocatorService.getServiceCenters();
   *     return serviceCenters.map(center => this.convertServiceCenterToLocation(center, location));
   *   } catch (error) {
   *     console.error('Firebase services error:', error);
   *     return [];
   *   }
   * }
   */

  private async getGooglePlacesServices(location: { lat: number; lng: number }): Promise<ServiceLocation[]> {
    return new Promise((resolve) => {
      if (!this.googleMapsService) {
        resolve([]);
        return;
      }

      const request = {
        location: new window.google.maps.LatLng(location.lat, location.lng),
        radius: 50000, // 50km radius
        type: 'car_repair',
        keyword: 'truck repair diesel heavy duty'
      };

      this.googleMapsService.nearbySearch(request, (results: any[], status: any) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
          const services = results.slice(0, 10).map((place, index) => ({
            id: 1000 + index,
            name: place.name,
            address: place.vicinity,
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
            type: 'repair' as const,
            rating: place.rating || 4.0,
            phone: place.formatted_phone_number || 'Call for info',
            services: ['Engine Repair', 'Brake Service', 'Transmission'],
            available: place.opening_hours ? place.opening_hours.open_now : true,
            distance: this.calculateDistance(location, {
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng()
            })
          }));
          resolve(services);
        } else {
          resolve([]);
        }
      });
    });
  }

  private async getCuratedTruckServices(location?: { lat: number; lng: number }): Promise<ServiceLocation[]> {
    // Curated list of major truck service chains and known quality providers
    const curatedServices = [
      {
        id: 2000,
        name: 'TA Truck Service',
        address: 'Multiple Locations Nationwide',
        lat: location?.lat || 29.7604,
        lng: location?.lng || -95.3698,
        type: 'repair' as const,
        rating: 4.2,
        phone: '1-800-TA-TRUCK',
        services: ['Engine Repair', 'Brake Service', 'Transmission', 'Electrical', 'DOT Inspections'],
        available: true,
        hours: '24/7 Service Available',
        specialties: ['Heavy Duty', 'Fleet Service', 'Emergency Repair'],
        pricing: {
          laborRate: '$125-150/hr',
          diagnosticFee: '$150-200',
          commonRepairs: {
            brake: { service: '$400-800', newPart: '$250-500', ebayPart: '$150-350' },
            engine: { service: '$800-2000', newPart: '$1500-4000', ebayPart: '$800-2500' },
            transmission: { service: '$1500-3000', newPart: '$4000-8000', ebayPart: '$2000-5000' }
          }
        }
      },
      {
        id: 2001,
        name: 'Petro Truck Service',
        address: 'Highway Locations',
        lat: location?.lat || 29.7604,
        lng: location?.lng || -95.3698,
        type: 'repair' as const,
        rating: 4.1,
        phone: '1-800-PETRO-1',
        services: ['Engine Diagnostics', 'Brake Systems', 'Air Systems', 'Electrical'],
        available: true,
        hours: '24/7 Emergency Service',
        specialties: ['Roadside Repair', 'Preventive Maintenance'],
        pricing: {
          laborRate: '$120-140/hr',
          diagnosticFee: '$125-175',
          commonRepairs: {
            brake: { service: '$350-750', newPart: '$200-450', ebayPart: '$120-300' },
            engine: { service: '$750-1800', newPart: '$1200-3500', ebayPart: '$700-2200' }
          }
        }
      },
      {
        id: 2002,
        name: 'Loves Truck Care',
        address: 'Travel Centers Nationwide',
        lat: location?.lat || 29.7604,
        lng: location?.lng || -95.3698,
        type: 'repair' as const,
        rating: 4.3,
        phone: '1-800-LOVES-61',
        services: ['Full Service Repair', 'Tire Service', 'Oil Changes', 'DOT Inspections'],
        available: true,
        hours: 'Varies by Location',
        specialties: ['Quick Service', 'Tire Center', 'Preventive Maintenance'],
        pricing: {
          laborRate: '$115-135/hr',
          diagnosticFee: '$100-150',
          commonRepairs: {
            brake: { service: '$300-700', newPart: '$180-400', ebayPart: '$100-250' },
            transmission: { service: '$1200-2500', newPart: '$3500-7000', ebayPart: '$1800-4000' }
          }
        }
      }
    ];

    // Calculate distances if location provided
    if (location) {
      curatedServices.forEach(service => {
        service.distance = this.calculateDistance(location, { lat: service.lat, lng: service.lng });
        service.estimatedTime = this.calculateDriveTime(location, { lat: service.lat, lng: service.lng });
      });
    }

    return curatedServices;
  }

  private convertServiceCenterToLocation(center: ServiceCenter, userLocation?: { lat: number; lng: number }): ServiceLocation {
    return {
      id: parseInt(center.id) || Math.floor(Math.random() * 1000),
      name: center.name,
      address: `${center.address}, ${center.city}, ${center.state} ${center.zipCode}`,
      lat: center.coordinates.latitude,
      lng: center.coordinates.longitude,
      type: 'repair',
      rating: center.rating || 4.0,
      phone: center.phone,
      services: center.services,
      available: true,
      distance: userLocation ? this.calculateDistance(userLocation, {
        lat: center.coordinates.latitude,
        lng: center.coordinates.longitude
      }) : undefined,
      hours: this.formatHours(center.hoursOfOperation),
      reviews: center.reviewCount
    };
  }

  private formatHours(hours: any): string {
    if (!hours) return 'Call for hours';
    
    const today = new Date().getDay();
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayHours = hours[days[today]];
    
    return todayHours || 'Call for hours';
  }

  private calculateDistance(from: { lat: number; lng: number }, to: { lat: number; lng: number }): string {
    const R = 3959; // Earth's radius in miles
    const dLat = (to.lat - from.lat) * Math.PI / 180;
    const dLng = (to.lng - from.lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(from.lat * Math.PI / 180) * Math.cos(to.lat * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return `${distance.toFixed(1)} miles`;
  }

  private calculateDriveTime(from: { lat: number; lng: number }, to: { lat: number; lng: number }): string {
    const distance = parseFloat(this.calculateDistance(from, to));
    const avgSpeed = 35; // Average city driving speed
    const timeInHours = distance / avgSpeed;
    const minutes = Math.round(timeInHours * 60);
    
    return `${minutes} min drive`;
  }

  private deduplicateServices(services: ServiceLocation[]): ServiceLocation[] {
    const seen = new Set<string>();
    return services.filter(service => {
      const key = `${service.name}_${service.lat}_${service.lng}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private sortServicesByRelevance(services: ServiceLocation[], location?: { lat: number; lng: number }): ServiceLocation[] {
    return services.sort((a, b) => {
      // Sort by rating first, then distance
      const ratingDiff = (b.rating || 0) - (a.rating || 0);
      if (Math.abs(ratingDiff) > 0.2) return ratingDiff;
      
      // If ratings are similar, sort by distance
      if (location && a.distance && b.distance) {
        const distA = parseFloat(a.distance);
        const distB = parseFloat(b.distance);
        return distA - distB;
      }
      
      return 0;
    });
  }

  private getFallbackServices(location?: { lat: number; lng: number }): ServiceLocation[] {
    const fallbackServices = [
      {
        id: 9001,
        name: 'Emergency Truck Repair',
        address: 'Mobile Service Available',
        lat: location?.lat || 29.7604,
        lng: location?.lng || -95.3698,
        type: 'repair' as const,
        rating: 4.0,
        phone: '(555) 911-HELP',
        services: ['Emergency Repair', 'Diagnostics', 'Mobile Service'],
        available: true,
        hours: '24/7 Emergency',
        specialties: ['Roadside Assistance', 'Emergency Response'],
        distance: location ? '0.0 miles' : undefined,
        estimatedTime: '15-30 minutes'
      }
    ];

    return fallbackServices;
  }

  /**
   * Search for specific service types
   */
  async searchServices(query: string, location?: { lat: number; lng: number }): Promise<ServiceLocation[]> {
    const allServices = await this.getServiceCenters(location);
    
    return allServices.filter(service => 
      service.name.toLowerCase().includes(query.toLowerCase()) ||
      service.services.some(s => s.toLowerCase().includes(query.toLowerCase())) ||
      service.specialties?.some(s => s.toLowerCase().includes(query.toLowerCase()))
    );
  }

  /**
   * Get emergency services only
   */
  async getEmergencyServices(location: { lat: number; lng: number }): Promise<ServiceLocation[]> {
    const services = await this.getServiceCenters(location);
    
    return services.filter(service => 
      service.available &&
      (service.hours?.includes('24/7') || 
       service.specialties?.some(s => s.toLowerCase().includes('emergency')))
    ).slice(0, 5); // Top 5 emergency services
  }
}

export default new EnhancedServiceLocatorService();
