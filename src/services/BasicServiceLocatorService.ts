import { ServiceLocation } from './EnhancedServiceLocatorService';
import { calculateDistance } from '../utils/distance';

/**
 * Lightweight service locator with essential functionality only.
 * Used as default export to reduce initial bundle size.
 */
export class ServiceLocatorService {
  private cache = new Map<string, ServiceLocation[]>();
  private cacheExpiry = 10 * 60 * 1000; // 10 minutes

  /**
   * Get basic service centers with minimal overhead
   */
  async getServiceCenters(location?: { lat: number; lng: number }): Promise<ServiceLocation[]> {
    const cacheKey = location ? `${location.lat}_${location.lng}` : 'default';
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      const services = await this.getBasicTruckServices(location);
      this.cache.set(cacheKey, services);
      setTimeout(() => this.cache.delete(cacheKey), this.cacheExpiry);
      return services;
    } catch (error) {
      console.error('Error fetching service centers:', error);
      return this.getFallbackServices(location);
    }
  }

  private async getBasicTruckServices(location?: { lat: number; lng: number }): Promise<ServiceLocation[]> {
    // Essential truck service providers only
    const services = [
      {
        id: 2000,
        name: 'TA Truck Service',
        address: 'Multiple Locations Nationwide',
        lat: location?.lat || 29.7604,
        lng: location?.lng || -95.3698,
        type: 'repair' as const,
        rating: 4.2,
        phone: '1-800-TA-TRUCK',
        services: ['Engine Repair', 'Brake Service', 'Transmission', 'DOT Inspections'],
        available: true,
        hours: '24/7 Service Available',
        specialties: ['Heavy Duty', 'Fleet Service', 'Emergency Repair']
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
        services: ['Engine Diagnostics', 'Brake Systems', 'Electrical'],
        available: true,
        hours: '24/7 Emergency Service',
        specialties: ['Roadside Repair', 'Preventive Maintenance']
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
        services: ['Full Service Repair', 'Tire Service', 'Oil Changes'],
        available: true,
        hours: 'Varies by Location',
        specialties: ['Quick Service', 'Tire Center']
      }
    ];

    // Calculate distances if location provided
    if (location) {
      services.forEach(service => {
        service.distance = calculateDistance(location, { lat: service.lat, lng: service.lng });
      });
    }

    return services;
  }

  private getFallbackServices(location?: { lat: number; lng: number }): ServiceLocation[] {
    return [
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
        specialties: ['Roadside Assistance'],
        distance: location ? '0.0 miles' : undefined
      }
    ];
  }
}

export default new ServiceLocatorService();