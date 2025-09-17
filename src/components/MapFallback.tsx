import { MapPin, Navigation, Phone, Star, ExternalLink, AlertTriangle } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';

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
  estimatedTime?: string;
  pricing?: any;
}

interface MapFallbackProps {
  locations: ServiceLocation[];
  onLocationSelect?: (location: ServiceLocation) => void;
  className?: string;
  userLocation?: { lat: number; lng: number };
}

export function MapFallback({ locations, onLocationSelect, className = "", userLocation }: MapFallbackProps) {
  const handleGetDirections = (address: string) => {
    const destination = encodeURIComponent(address);
    const url = userLocation 
      ? `https://www.google.com/maps/dir/${userLocation.lat},${userLocation.lng}/${destination}`
      : `https://www.google.com/maps/dir//${destination}`;
    window.open(url, '_blank');
  };

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const getTypeIcon = (type: string) => {
    const colors = {
      repair: 'bg-red-500',
      parts: 'bg-blue-500', 
      towing: 'bg-green-500'
    };
    return colors[type] || 'bg-gray-500';
  };

  const sortedLocations = locations.sort((a, b) => {
    if (a.distance && b.distance) {
      const distA = parseFloat(a.distance.replace(' miles', ''));
      const distB = parseFloat(b.distance.replace(' miles', ''));
      return distA - distB;
    }
    return 0;
  });

  return (
    <div className={`relative ${className}`}>
      {/* Map Placeholder */}
      <div className="w-full h-64 sm:h-80 md:h-96 rounded-xl overflow-hidden border border-white/20 shadow-2xl mb-4" style={{
        background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.6) 0%, rgba(30, 30, 30, 0.8) 100%)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)'
      }}>
        {/* Interactive Map Simulation */}
        <div className="relative w-full h-full flex items-center justify-center">
          <div className="text-center z-10">
            <MapPin className="w-12 h-12 mx-auto mb-4 text-white/60" />
            <h3 className="text-white text-lg font-semibold mb-2">Service Locations Map</h3>
            <p className="text-white/80 text-sm mb-4">
              {locations.length} services found in your area
            </p>
            <div className="text-xs text-white/60 mb-4">
              Interactive map will load with Google Maps API key
            </div>
            
            {/* API Setup Button */}
            <Button 
              variant="outline" 
              size="sm" 
              className="glass-subtle border-white/20 text-white hover:bg-white/10"
              onClick={() => window.open('https://console.cloud.google.com/apis/library/maps-backend.googleapis.com', '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Setup Google Maps API
            </Button>
          </div>

          {/* Animated Location Markers */}
          <div className="absolute inset-0">
            {/* Create markers based on actual locations */}
            {sortedLocations.slice(0, 6).map((location, index) => {
              const positions = [
                { top: '25%', left: '30%' },
                { top: '40%', right: '25%' },
                { bottom: '35%', left: '20%' },
                { top: '60%', right: '30%' },
                { bottom: '25%', right: '40%' },
                { top: '35%', left: '45%' }
              ];
              
              const position = positions[index] || { top: '50%', left: '50%' };
              
              return (
                <div 
                  key={location.id}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer"
                  style={position}
                  onClick={() => onLocationSelect?.(location)}
                >
                  <div className={`w-6 h-6 ${getTypeIcon(location.type)} rounded-full border-2 border-white shadow-lg animate-pulse`}
                       style={{ animationDelay: `${index * 200}ms` }}>
                    <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                      <div className="bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 hover:opacity-100 transition-opacity">
                        {location.name}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {/* Your Location */}
            {userLocation && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="w-4 h-4 bg-orange-500 rounded-full border-2 border-white shadow-lg">
                  <div className="absolute inset-0 bg-orange-500 rounded-full animate-ping opacity-75"></div>
                </div>
                <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-white text-xs">
                  You
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Map Legend */}
      <div className="absolute top-4 left-4 rounded-lg p-3 border border-white/20" style={{
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)'
      }}>
        <div className="text-white text-sm font-medium mb-2">Service Types</div>
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-white text-xs">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span>Repair Shops ({locations.filter(l => l.type === 'repair').length})</span>
          </div>
          <div className="flex items-center gap-2 text-white text-xs">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span>Parts Suppliers ({locations.filter(l => l.type === 'parts').length})</span>
          </div>
          <div className="flex items-center gap-2 text-white text-xs">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>Tow Services ({locations.filter(l => l.type === 'towing').length})</span>
          </div>
          <div className="flex items-center gap-2 text-white text-xs">
            <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
            <span>Your Location</span>
          </div>
        </div>
      </div>

      {/* Service List Alternative */}
      <div className="mt-4">
        <Alert className="mb-4 border-blue-500/20 bg-blue-500/5">
          <AlertTriangle className="h-4 w-4 text-blue-400" />
          <AlertDescription className="text-blue-300">
            <strong>Map Alternative:</strong> Interactive service list with directions. 
            Enable Google Maps API for full map functionality.
          </AlertDescription>
        </Alert>

        <div className="grid gap-3">
          {sortedLocations.slice(0, 3).map((location) => (
            <Card 
              key={location.id} 
              className="glass-subtle border-white/20 cursor-pointer hover:bg-white/5 transition-all"
              onClick={() => onLocationSelect?.(location)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-3 h-3 ${getTypeIcon(location.type)} rounded-full`}></div>
                      <h4 className="text-white font-medium">{location.name}</h4>
                      <Badge variant={location.available ? "default" : "secondary"} className="text-xs">
                        {location.available ? "Open" : "Closed"}
                      </Badge>
                    </div>
                    
                    <p className="text-white/80 text-sm mb-2">{location.address}</p>
                    
                    <div className="flex items-center gap-4 text-sm text-white/70">
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-yellow-400 fill-current" />
                        <span>{location.rating}</span>
                      </div>
                      {location.distance && (
                        <span>{location.distance}</span>
                      )}
                      {location.estimatedTime && (
                        <span>{location.estimatedTime}</span>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-1 mt-2">
                      {location.services.slice(0, 3).map((service) => (
                        <Badge key={service} variant="outline" className="text-xs border-white/20 text-white/80">
                          {service}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2 ml-4">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGetDirections(location.address);
                      }}
                      className="glass-subtle border-white/20 text-white hover:bg-white/10"
                    >
                      <Navigation className="h-3 w-3 mr-1" />
                      Directions
                    </Button>
                    
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCall(location.phone);
                      }}
                      className="glass-subtle border-white/20 text-white hover:bg-white/10"
                    >
                      <Phone className="h-3 w-3 mr-1" />
                      Call
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {locations.length > 3 && (
          <div className="text-center mt-4">
            <p className="text-white/60 text-sm">
              {locations.length - 3} more services available. Use map for complete view.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}