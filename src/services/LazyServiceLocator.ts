import { ServiceLocation } from './EnhancedServiceLocatorService';
import basicService from './BasicServiceLocatorService';

/**
 * Lazy-loaded enhanced service locator.
 * Falls back to basic service if enhanced version fails to load.
 */
class LazyServiceLocator {
  private enhancedService: any = null;
  private loadingPromise: Promise<any> | null = null;

  async getServiceCenters(location?: { lat: number; lng: number }): Promise<ServiceLocation[]> {
    try {
      // Try to load enhanced service on demand
      if (!this.enhancedService && !this.loadingPromise) {
        this.loadingPromise = this.loadEnhancedService();
      }

      if (this.loadingPromise) {
        await this.loadingPromise;
      }

      if (this.enhancedService) {
        return await this.enhancedService.getServiceCenters(location);
      }
    } catch (error) {
      console.warn('Enhanced service failed, using basic service:', error);
    }

    // Fallback to basic service
    return await basicService.getServiceCenters(location);
  }

  async searchServices(query: string, location?: { lat: number; lng: number }): Promise<ServiceLocation[]> {
    const allServices = await this.getServiceCenters(location);
    
    return allServices.filter(service => 
      service.name.toLowerCase().includes(query.toLowerCase()) ||
      service.services.some(s => s.toLowerCase().includes(query.toLowerCase())) ||
      service.specialties?.some(s => s.toLowerCase().includes(query.toLowerCase()))
    );
  }

  async getEmergencyServices(location: { lat: number; lng: number }): Promise<ServiceLocation[]> {
    const services = await this.getServiceCenters(location);
    
    return services.filter(service => 
      service.available &&
      (service.hours?.includes('24/7') || 
       service.specialties?.some(s => s.toLowerCase().includes('emergency')))
    ).slice(0, 5);
  }

  private async loadEnhancedService() {
    try {
      const module = await import('./EnhancedServiceLocatorService');
      this.enhancedService = module.default;
      this.loadingPromise = null;
    } catch (error) {
      console.warn('Failed to load enhanced service locator:', error);
      this.loadingPromise = null;
      throw error;
    }
  }
}

export default new LazyServiceLocator();