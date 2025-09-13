import { MapPin, Navigation, Phone } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface ServiceLocation {
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
}

interface MapFallbackProps {
  locations: ServiceLocation[];
  onLocationSelect?: (location: ServiceLocation) => void;
  className?: string;
}

export function MapFallback({ locations, onLocationSelect, className = "" }: MapFallbackProps) {
  const handleGetDirections = (address: string) => {
    const destination = encodeURIComponent(address);
    const url = `https://www.google.com/maps/dir//${destination}`;
    window.open(url, '_blank');
  };

  const handleCall = (phone: string) => {
    window.open(`tel:${phone}`, '_self');
  };

  return (
    <div className={`relative ${className}`}>
      <div className="w-full h-64 sm:h-80 md:h-96 rounded-xl overflow-hidden border border-white/20 shadow-2xl" style={{
        background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.6) 0%, rgba(30, 30, 30, 0.8) 100%)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)'
      }}>
        {/* Map placeholder with locations */}
        <div className="relative w-full h-full flex items-center justify-center">
          <div className="text-center">
            <MapPin className="w-12 h-12 mx-auto mb-4 text-white/60" />
            <h3 className="text-white text-lg font-semibold mb-2">Service Locations Map</h3>
            <p className="text-white/80 text-sm mb-4">
              {locations.length} services found in your area
            </p>
            <div className="text-xs text-white/60">
              Google Maps integration will load with valid API key
            </div>
          </div>

          {/* Location markers overlay */}
          <div className="absolute inset-0">
            {/* Repair Shops */}
            <div className="absolute top-1/4 left-1/3 transform -translate-x-1/2 -translate-y-1/2">
              <div className="w-6 h-6 bg-red-500 rounded-full border-2 border-white shadow-lg animate-pulse"></div>
            </div>
            
            <div className="absolute top-1/2 right-1/4 transform -translate-x-1/2 -translate-y-1/2">
              <div className="w-6 h-6 bg-red-500 rounded-full border-2 border-white shadow-lg animate-pulse delay-300"></div>
            </div>
            
            {/* Parts Suppliers */}
            <div className="absolute bottom-1/3 left-1/4 transform -translate-x-1/2 -translate-y-1/2">
              <div className="w-6 h-6 bg-blue-500 rounded-full border-2 border-white shadow-lg animate-pulse delay-500"></div>
            </div>
            
            {/* Tow Services */}
            <div className="absolute top-3/4 right-1/3 transform -translate-x-1/2 -translate-y-1/2">
              <div className="w-6 h-6 bg-green-500 rounded-full border-2 border-white shadow-lg animate-pulse delay-700"></div>
            </div>
            
            {/* Your Location */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="w-4 h-4 bg-orange-500 rounded-full border-2 border-white shadow-lg">
                <div className="absolute inset-0 bg-orange-500 rounded-full animate-ping opacity-75"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Map Legend */}
      <div className="absolute top-4 left-4 rounded-lg p-3 border border-white/20" style={{
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)'
      }}>
        <div className="flex items-center gap-2 text-white text-sm">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <span>Repair Shops</span>
        </div>
        <div className="flex items-center gap-2 text-white text-sm mt-1">
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          <span>Parts Suppliers</span>
        </div>
        <div className="flex items-center gap-2 text-white text-sm mt-1">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span>Tow Services</span>
        </div>
        <div className="flex items-center gap-2 text-white text-sm mt-1">
          <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
          <span>Your Location</span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="absolute bottom-4 left-4 right-4">
        <div className="flex flex-wrap gap-2 justify-center">
          <Button variant="outline" size="sm" className="glass-subtle border-white/20 text-white hover:bg-white/10">
            <Navigation className="h-4 w-4 mr-2" />
            Get Directions
          </Button>
          <Button variant="outline" size="sm" className="glass-subtle border-white/20 text-white hover:bg-white/10">
            <MapPin className="h-4 w-4 mr-2" />
            Nearest First
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="glass-subtle border-white/20 text-white hover:bg-white/10"
            onClick={() => window.open('https://console.cloud.google.com/apis/library/maps-backend.googleapis.com', '_blank')}
          >
            Setup Google Maps
          </Button>
        </div>
      </div>
    </div>
  );
}