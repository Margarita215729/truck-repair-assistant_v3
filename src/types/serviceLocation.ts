/**
 * Unified ServiceLocation interface
 * Represents a service center location for truck repair, parts, or towing services
 */
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
    laborRate?: string;
    diagnosticFee?: string;
    commonRepairs?: any;
    labor?: string;
    parts?: string;
    emergency?: string;
  };
}

/**
 * Service location with additional metadata for enhanced functionality
 */
export interface EnhancedServiceLocation extends ServiceLocation {
  reviews?: number;
  hours?: string;
  specialties?: string[];
  pricing?: {
    labor?: string;
    parts?: string;
    emergency?: string;
  };
}
