import { useEffect, useRef, useState } from 'react';
import { useGoogleMaps } from '../hooks/useGoogleMaps';
import { Button } from './ui/button';
import { MapPin, Navigation, Phone, Star, Loader2 } from 'lucide-react';
import { MapFallback } from './MapFallback';
import { DEBUG } from '../utils/debug';
import { ServiceLocation } from '../types/serviceLocation';

interface GoogleMapProps {
  locations: ServiceLocation[];
  userLocation?: { lat: number; lng: number };
  onLocationSelect?: (location: ServiceLocation) => void;
  className?: string;
}

export function GoogleMap({ locations, userLocation, onLocationSelect, className }: GoogleMapProps) {
  const { isLoaded, error } = useGoogleMaps();
  
  // Additional safety check for Google Maps API availability
  const isGoogleMapsReady = isLoaded && window.google && window.google.maps && window.google.maps.Map;
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<ServiceLocation | null>(null);

  // Default location (Houston, TX) if no user location
  const defaultLocation = { lat: 29.7604, lng: -95.3698 };

  useEffect(() => {
    // Enhanced validation for Google Maps API readiness
    if (!isGoogleMapsReady || !mapRef.current) {
      if (isLoaded && !isGoogleMapsReady) {
        DEBUG.warn('Google Maps API loaded but not fully ready, waiting...');
      }
      return;
    }

    try {
      // Initialize map with different configurations for AdvancedMarkerElement vs Styling
      const center = userLocation || defaultLocation;
      
      // Base configuration
      const baseConfig = {
        zoom: 12,
        center: center,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControlOptions: {
          position: window.google?.maps?.ControlPosition?.TOP_RIGHT || 1
        }
      };

      // Configuration with Map ID for AdvancedMarkerElement (no custom styles allowed)
      const mapIdConfig = {
        ...baseConfig,
        mapId: 'TRUCK_DIAGNOSIS_MAP' // Required for AdvancedMarkerElement
      };

      // Configuration with custom dark styles (no Map ID)
      const styledConfig = {
        ...baseConfig,
        styles: [
          {
            "featureType": "all",
            "elementType": "geometry.fill",
            "stylers": [{ "color": "#1a1a1a" }]
          },
          {
            "featureType": "all",
            "elementType": "labels.text.fill",
            "stylers": [{ "color": "#ffffff" }]
          },
          {
            "featureType": "all",
            "elementType": "labels.text.stroke",
            "stylers": [{ "color": "#000000" }, { "lightness": 13 }]
          },
          {
            "featureType": "administrative",
            "elementType": "geometry.fill",
            "stylers": [{ "color": "#1a1a1a" }]
          },
          {
            "featureType": "road",
            "elementType": "geometry.fill",
            "stylers": [{ "color": "#2a2a2a" }]
          },
          {
            "featureType": "water",
            "elementType": "geometry.fill",
            "stylers": [{ "color": "#0f0f0f" }]
          }
        ]
      };

      // Try to create map with Map ID first for AdvancedMarkerElement support
      let map;
      let useAdvancedMarkers = false;
      
      // Check if AdvancedMarkerElement is available
      if (window.google.maps.marker?.AdvancedMarkerElement) {
        try {
          map = new window.google.maps.Map(mapRef.current, mapIdConfig);
          useAdvancedMarkers = true;
          DEBUG.info('Map initialized with Map ID for AdvancedMarkerElement support');
        } catch (error) {
          DEBUG.warn('Failed to initialize map with Map ID, falling back to styled map:', error);
          map = new window.google.maps.Map(mapRef.current, styledConfig);
        }
      } else {
        // Use styled configuration when AdvancedMarkerElement is not available
        map = new window.google.maps.Map(mapRef.current, styledConfig);
        DEBUG.info('Map initialized with custom styles (AdvancedMarkerElement not available)');
      }

    mapInstanceRef.current = map;

    // Clear existing markers (works for both legacy Marker and AdvancedMarkerElement)
    markersRef.current.forEach(marker => {
      if (marker.setMap) {
        marker.setMap(null);
      } else if (marker.map) {
        marker.map = null;
      }
    });
    markersRef.current = [];

    // Add user location marker using AdvancedMarkerElement
    if (userLocation) {
      const createUserMarker = () => {
        // Try AdvancedMarkerElement first if available and using advanced markers
        if (window.google.maps.marker?.AdvancedMarkerElement && useAdvancedMarkers) {
          try {
            // Create custom pin element for user location
            const userPinElement = document.createElement('div');
            userPinElement.innerHTML = `
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="8" fill="#f97316" stroke="#ffffff" stroke-width="2"/>
                <circle cx="12" cy="12" r="3" fill="#ffffff"/>
              </svg>
            `;
            userPinElement.style.cursor = 'pointer';
            userPinElement.style.transform = 'scale(1)';
            userPinElement.style.transition = 'transform 0.2s ease';
            
            const userMarker = new window.google.maps.marker.AdvancedMarkerElement({
              position: userLocation,
              map: map,
              title: 'Your Location',
              content: userPinElement
            });
            
            DEBUG.info('Created AdvancedMarkerElement for user location');
            return userMarker;
          } catch (advancedError) {
            DEBUG.warn('AdvancedMarkerElement failed for user location, using legacy Marker:', advancedError);
          }
        }
        
        // Fallback to legacy Marker
        DEBUG.info('Using legacy Marker for user location');
        return new window.google.maps.Marker({
          position: userLocation,
          map: map,
          title: 'Your Location',
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="8" fill="#f97316" stroke="#ffffff" stroke-width="2"/>
                <circle cx="12" cy="12" r="3" fill="#ffffff"/>
              </svg>
            `),
            scaledSize: new window.google.maps.Size(24, 24),
          }
        });
      };
      
      const userMarker = createUserMarker();
      if (userMarker) {
        markersRef.current.push(userMarker);
      }
    }

    // Add service location markers with proper icons
    locations.forEach(location => {
      const getMarkerIcon = (type: string) => {
        const iconMap = {
          'repair': '🔧',
          'parts': '📦', 
          'towing': '🚛'
        };
        return iconMap[type] || '📍';
      };

      const getMarkerColor = (type: string) => {
        const colorMap = {
          'repair': '#ef4444',
          'parts': '#3b82f6',
          'towing': '#f59e0b'
        };
        return colorMap[type] || '#6b7280';
      };

      const markerColor = getMarkerColor(location.type);
      const markerIcon = getMarkerIcon(location.type);

      // Create marker with proper icon
      const marker = new window.google.maps.Marker({
        position: { lat: location.lat, lng: location.lng },
        map: map,
        title: location.name,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="16" r="14" fill="${markerColor}" stroke="#ffffff" stroke-width="2"/>
              <text x="16" y="20" text-anchor="middle" fill="white" font-size="12" font-weight="bold">${markerIcon}</text>
            </svg>
          `),
          scaledSize: new window.google.maps.Size(32, 32),
          anchor: new window.google.maps.Point(16, 16)
        }
      });

      // Add info window
      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 8px; max-width: 280px;">
            <h3 style="margin: 0 0 8px 0; color: #333; font-size: 14px;">${location.name}</h3>
            <p style="margin: 0 0 4px 0; color: #666; font-size: 12px;">${location.address}</p>
            <p style="margin: 0 0 4px 0; color: #666; font-size: 12px;">Rating: ${location.rating}⭐</p>
            ${location.phone ? `<p style="margin: 0 0 4px 0; color: #666; font-size: 12px;">Phone: ${location.phone}</p>` : ''}
            ${location.services ? `<p style="margin: 0 0 8px 0; color: #666; font-size: 12px;">Services: ${location.services.slice(0, 3).join(', ')}</p>` : ''}
            <div style="display: flex; gap: 4px; margin-top: 8px;">
              <button onclick="selectService(${location.id})" style="
                background: #4285F4; 
                color: white; 
                border: none; 
                padding: 6px 10px; 
                border-radius: 4px; 
                cursor: pointer; 
                font-size: 11px;
                flex: 1;
              ">Select</button>
              <button onclick="navigateToService(${location.id})" style="
                background: #34A853; 
                color: white; 
                border: none; 
                padding: 6px 10px; 
                border-radius: 4px; 
                cursor: pointer; 
                font-size: 11px;
                flex: 1;
              ">🚛 Navigate</button>
            </div>
          </div>
        `
      });

      // Add click listener to marker
      marker.addListener('click', () => {
        setSelectedLocation(location);
        onLocationSelect?.(location);
        infoWindow.open(map, marker);
        
        // Center map on clicked location
        map.setCenter({ lat: location.lat, lng: location.lng });
        map.setZoom(15);
      });

      markersRef.current.push(marker);
    });

    // Add truck height restrictions and safe routes
    addTruckRoutesAndRestrictions(map, userLocation);

    // Fit map to show all markers
    if (locations.length > 0 || userLocation) {
      const bounds = new window.google.maps.LatLngBounds();
      
      if (userLocation) {
        bounds.extend(userLocation);
      }
      
      locations.forEach(location => {
        bounds.extend({ lat: location.lat, lng: location.lng });
      });
      
      map.fitBounds(bounds);
      
      // Ensure minimum zoom level
      const listener = window.google.maps.event.addListener(map, 'idle', () => {
        if (map.getZoom() > 15) map.setZoom(15);
        window.google.maps.event.removeListener(listener);
      });
    }

    } catch (error) {
      DEBUG.error('Error initializing Google Map:', error);
      // The component will fall back to the error state handled by the parent
    }

  }, [isGoogleMapsReady, locations, userLocation, onLocationSelect]);

  // Function to add truck routes and height restrictions
  const addTruckRoutesAndRestrictions = (map: any, userLocation?: { lat: number; lng: number }) => {
    if (!userLocation) return;

    // Add sample height restrictions (in real app, this would come from API)
    const heightRestrictions = [
      {
        path: [
          { lat: userLocation.lat + 0.01, lng: userLocation.lng + 0.01 },
          { lat: userLocation.lat + 0.02, lng: userLocation.lng + 0.02 }
        ],
        maxHeight: 12.5,
        description: 'Low Bridge - 12.5ft'
      },
      {
        path: [
          { lat: userLocation.lat - 0.01, lng: userLocation.lng - 0.01 },
          { lat: userLocation.lat - 0.02, lng: userLocation.lng - 0.02 }
        ],
        maxHeight: 14.0,
        description: 'Restricted Route - 14.0ft'
      }
    ];

    // Add safe routes (in real app, this would come from truck routing API)
    const safeRoutes = [
      {
        path: [
          { lat: userLocation.lat, lng: userLocation.lng },
          { lat: userLocation.lat + 0.005, lng: userLocation.lng + 0.005 },
          { lat: userLocation.lat + 0.01, lng: userLocation.lng + 0.01 }
        ],
        description: 'Truck-Safe Route'
      }
    ];

    // Add height restriction polylines
    heightRestrictions.forEach(restriction => {
      const polyline = new window.google.maps.Polyline({
        path: restriction.path,
        geodesic: true,
        strokeColor: '#FF0000', // Red for restrictions
        strokeOpacity: 0.8,
        strokeWeight: 4,
        map: map
      });

      // Add restriction info window
      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 4px; font-size: 12px;">
            <strong>${restriction.description}</strong><br/>
            Max Height: ${restriction.maxHeight}ft<br/>
            <span style="color: red;">⚠️ Height Restricted</span>
          </div>
        `
      });

      polyline.addListener('click', (event: any) => {
        infoWindow.setPosition(event.latLng);
        infoWindow.open(map);
      });
    });

    // Add safe route polylines
    safeRoutes.forEach(route => {
      const polyline = new window.google.maps.Polyline({
        path: route.path,
        geodesic: true,
        strokeColor: '#00FF00', // Green for safe routes
        strokeOpacity: 0.6,
        strokeWeight: 3,
        map: map
      });

      // Add route info window
      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 4px; font-size: 12px;">
            <strong>${route.description}</strong><br/>
            <span style="color: green;">✅ Truck-Safe Route</span>
          </div>
        `
      });

      polyline.addListener('click', (event: any) => {
        infoWindow.setPosition(event.latLng);
        infoWindow.open(map);
      });
    });
  };

  const handleGetDirections = (location: ServiceLocation) => {
    if (!window.google || !userLocation) return;
    
    const directionsUrl = `https://www.google.com/maps/dir/${userLocation.lat},${userLocation.lng}/${location.lat},${location.lng}`;
    window.open(directionsUrl, '_blank');
  };

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  if (error) {
    DEBUG.info('Using fallback map due to error:', error);
    // Use fallback map when Google Maps fails to load
    return <MapFallback locations={locations} onLocationSelect={onLocationSelect} className={className} />;
  }

  if (!isGoogleMapsReady) {
    return (
      <div className="flex items-center justify-center h-64 rounded-lg" style={{
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)'
      }}>
        <div className="text-center p-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-400" />
          <p className="text-white/90">Loading map...</p>
          <p className="text-white/60 text-sm mt-1">Please wait while we load Google Maps</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div ref={mapRef} className="w-full h-full rounded-lg" />
      
      {/* Map Legend */}
      <div className="absolute top-4 left-4 rounded-lg p-3 border border-white/20" style={{
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)'
      }}>
        <div className="text-white text-xs font-semibold mb-2">Legend:</div>
        <div className="flex items-center gap-2 text-white text-xs mb-1">
          <span className="text-lg">🔧</span>
          <span>Repair Centers</span>
        </div>
        <div className="flex items-center gap-2 text-white text-xs mb-1">
          <span className="text-lg">📦</span>
          <span>Parts Stores</span>
        </div>
        <div className="flex items-center gap-2 text-white text-xs mb-1">
          <span className="text-lg">🚛</span>
          <span>Towing Services</span>
        </div>
        <div className="flex items-center gap-2 text-white text-xs mb-1">
          <span className="text-lg">🔵</span>
          <span>Your Location</span>
        </div>
        <div className="flex items-center gap-2 text-white text-xs mb-1">
          <span className="text-lg">🟢</span>
          <span>Safe Routes</span>
        </div>
        <div className="flex items-center gap-2 text-white text-xs">
          <span className="text-lg">🔴</span>
          <span>Height Restricted</span>
        </div>
      </div>

      {/* Selected Location Info */}
      {selectedLocation && (
        <div className="absolute bottom-4 left-4 right-4 rounded-lg p-4 border border-white/20" style={{
          background: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)'
        }}>
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="font-semibold text-white">{selectedLocation.name}</h3>
              <p className="text-sm text-white/80">{selectedLocation.address}</p>
              <div className="flex items-center gap-1 mt-1">
                <Star className="h-4 w-4 text-yellow-400 fill-current" />
                <span className="text-sm text-white">{selectedLocation.rating}</span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedLocation(null)}
              className="text-white hover:bg-white/10"
            >
              ×
            </Button>
          </div>
          
          <div className="flex flex-wrap gap-2 mb-3">
            {selectedLocation.services.slice(0, 3).map((service) => (
              <span key={service} className="text-xs px-2 py-1 bg-white/10 rounded text-white">
                {service}
              </span>
            ))}
          </div>
          
          <div className="flex gap-2">
            {userLocation && (
              <Button 
                size="sm" 
                onClick={() => handleGetDirections(selectedLocation)}
                className="flex-1"
              >
                <Navigation className="h-4 w-4 mr-1" />
                Directions
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleCall(selectedLocation.phone)}
              className="glass-subtle border-white/20 text-white hover:bg-white/10"
            >
              <Phone className="h-4 w-4 mr-1" />
              Call
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}