import React, { useEffect, useRef, useState } from 'react';

interface ServiceLocation {
  id: number;
  name: string;
  address: string;
  lat: number;
  lng: number;
  type: 'repair' | 'parts' | 'towing';
  rating: number;
  phone?: string;
  services?: string[];
  specialties?: string[];
  available?: boolean;
}

interface TruckServiceMapProps {
  userLocation?: { lat: number; lng: number; city?: string; state?: string };
  serviceLocations?: ServiceLocation[];
  truckHeight?: number; // in feet
  truckWeight?: number; // in pounds
  truckLength?: number; // in feet
  onServiceSelect?: (service: ServiceLocation) => void;
}

declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

export const TruckServiceMap: React.FC<TruckServiceMapProps> = ({
  userLocation,
  serviceLocations = [],
  truckHeight = 13.5, // Default truck height in feet
  truckWeight = 80000, // Default truck weight in pounds
  truckLength = 70, // Default truck length in feet
  onServiceSelect
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load Google Maps API
  useEffect(() => {
    const loadGoogleMaps = () => {
      if (window.google && window.google.maps) {
        setIsLoaded(true);
        return;
      }

      // Check if script is already being loaded
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=geometry,places&callback=initMap`;
      script.async = true;
      script.defer = true;
      
      window.initMap = () => {
        setIsLoaded(true);
      };

      script.onerror = (error) => {
        console.error('Failed to load Google Maps:', error);
        setError('Failed to load Google Maps API');
      };

      document.head.appendChild(script);
    };

    loadGoogleMaps();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!isLoaded || !mapRef.current) {
      return;
    }

    // Add small delay to ensure DOM is ready
    const initMap = () => {
      try {
        const mapOptions = {
          center: userLocation ? { lat: userLocation.lat, lng: userLocation.lng } : { lat: 39.8283, lng: -98.5795 }, // Center of USA
          zoom: userLocation ? 12 : 4,
          mapTypeId: window.google.maps.MapTypeId.ROADMAP,
          styles: [
            {
              featureType: 'road',
              elementType: 'geometry',
              stylers: [{ color: '#f5f5f5' }]
            },
            {
              featureType: 'road.highway',
              elementType: 'geometry',
              stylers: [{ color: '#e0e0e0' }]
            },
            {
              featureType: 'road.highway',
              elementType: 'labels',
              stylers: [{ visibility: 'on' }]
            }
          ]
        };

        mapInstanceRef.current = new window.google.maps.Map(mapRef.current, mapOptions);
        
        // Force map to resize after initialization
        setTimeout(() => {
          if (mapInstanceRef.current) {
            window.google.maps.event.trigger(mapInstanceRef.current, 'resize');
          }
        }, 200);

        // Add user location marker
        if (userLocation) {
          const userMarker = new window.google.maps.Marker({
            position: { lat: userLocation.lat, lng: userLocation.lng },
            map: mapInstanceRef.current,
            title: 'Your Location',
            icon: {
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" fill="#4285F4" stroke="white" stroke-width="2"/>
                  <circle cx="12" cy="12" r="4" fill="white"/>
                </svg>
              `),
              scaledSize: new window.google.maps.Size(24, 24)
            }
          });
        }

      } catch (err) {
        setError('Failed to initialize map');
        console.error('Map initialization error:', err);
      }
    };

    // Add small delay to ensure DOM is ready
    setTimeout(initMap, 100);
  }, [isLoaded, userLocation]);

  // Add service location markers
  useEffect(() => {
    if (!mapInstanceRef.current || !serviceLocations.length) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    serviceLocations.forEach(service => {
      const marker = new window.google.maps.Marker({
        position: { lat: service.lat, lng: service.lng },
        map: mapInstanceRef.current,
        title: service.name,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="16" r="14" fill="${getServiceColor(service.type)}" stroke="white" stroke-width="2"/>
              <text x="16" y="20" text-anchor="middle" fill="white" font-size="12" font-weight="bold">${getServiceIcon(service.type)}</text>
            </svg>
          `),
          scaledSize: new window.google.maps.Size(32, 32)
        }
      });

      // Add info window
      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 8px; max-width: 280px;">
            <h3 style="margin: 0 0 8px 0; color: #333; font-size: 14px;">${service.name}</h3>
            <p style="margin: 0 0 4px 0; color: #666; font-size: 12px;">${service.address}</p>
            <p style="margin: 0 0 4px 0; color: #666; font-size: 12px;">Rating: ${service.rating}⭐</p>
            ${service.phone ? `<p style="margin: 0 0 4px 0; color: #666; font-size: 12px;">Phone: ${service.phone}</p>` : ''}
            ${service.services ? `<p style="margin: 0 0 8px 0; color: #666; font-size: 12px;">Services: ${service.services.slice(0, 3).join(', ')}</p>` : ''}
            <div style="display: flex; gap: 4px; margin-top: 8px;">
              <button onclick="selectService(${service.id})" style="
                background: #4285F4; 
                color: white; 
                border: none; 
                padding: 6px 10px; 
                border-radius: 4px; 
                cursor: pointer; 
                font-size: 11px;
                flex: 1;
              ">Select</button>
              <button onclick="navigateToService(${service.id})" style="
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
            <div style="margin-top: 6px; padding: 4px; background: #f0f0f0; border-radius: 3px; font-size: 10px; color: #666;">
              <strong>Truck Route:</strong><br/>
              Height: ${truckHeight}ft | Weight: ${Math.round(truckWeight/1000)}k lbs | Length: ${truckLength}ft
            </div>
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindow.open(mapInstanceRef.current, marker);
      });

      markersRef.current.push(marker);
    });

    // Add global functions for service selection and navigation
    (window as any).selectService = (serviceId: number) => {
      const service = serviceLocations.find(s => s.id === serviceId);
      if (service && onServiceSelect) {
        onServiceSelect(service);
      }
    };

    (window as any).navigateToService = (serviceId: number) => {
      const service = serviceLocations.find(s => s.id === serviceId);
      if (service) {
        openTruckRoute(service);
      }
    };

  }, [serviceLocations, onServiceSelect]);

  // Add truck height restrictions layer
  useEffect(() => {
    if (!mapInstanceRef.current || !userLocation) return;

    // This would typically come from a truck routing API or database
    // For demo purposes, we'll add some sample height restrictions
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

    heightRestrictions.forEach(restriction => {
      const polyline = new window.google.maps.Polyline({
        path: restriction.path,
        geodesic: true,
        strokeColor: restriction.maxHeight < truckHeight ? '#FF0000' : '#00FF00',
        strokeOpacity: 0.8,
        strokeWeight: 4,
        map: mapInstanceRef.current
      });

      // Add restriction info
      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 4px; font-size: 12px;">
            <strong>${restriction.description}</strong><br/>
            Max Height: ${restriction.maxHeight}ft<br/>
            Your Truck: ${truckHeight}ft<br/>
            <span style="color: ${restriction.maxHeight < truckHeight ? 'red' : 'green'};">
              ${restriction.maxHeight < truckHeight ? '⚠️ Too Low' : '✅ Safe'}
            </span>
          </div>
        `
      });

      polyline.addListener('click', (event: any) => {
        infoWindow.setPosition(event.latLng);
        infoWindow.open(mapInstanceRef.current);
      });
    });

  }, [userLocation, truckHeight]);

  const getServiceColor = (type: string) => {
    switch (type) {
      case 'repair': return '#e74c3c';
      case 'parts': return '#3498db';
      case 'towing': return '#f39c12';
      default: return '#95a5a6';
    }
  };

  const getServiceIcon = (type: string) => {
    switch (type) {
      case 'repair': return '🔧';
      case 'parts': return '📦';
      case 'towing': return '🚛';
      default: return '📍';
    }
  };

  // Function to create Google Maps URL with truck-specific routing
  const createTruckRouteURL = (destination: ServiceLocation) => {
    if (!userLocation) return null;

    const origin = `${userLocation.lat},${userLocation.lng}`;
    const dest = `${destination.lat},${destination.lng}`;
    
    // Create truck-specific parameters
    const truckParams = new URLSearchParams({
      origin: origin,
      destination: dest,
      travelmode: 'driving',
      // Truck-specific parameters
      avoid: 'tolls', // Avoid tolls for cost savings
      waypoints: '', // Can be used for truck stops
    });

    // Add truck restrictions as avoid parameters
    const restrictions = [];
    if (truckHeight > 13.5) restrictions.push('highways');
    if (truckWeight > 80000) restrictions.push('ferries');
    if (truckLength > 70) restrictions.push('tunnels');
    
    if (restrictions.length > 0) {
      truckParams.set('avoid', restrictions.join('|'));
    }

    return `https://www.google.com/maps/dir/?api=1&${truckParams.toString()}`;
  };

  // Function to open Google Maps with truck route
  const openTruckRoute = (service: ServiceLocation) => {
    const url = createTruckRouteURL(service);
    if (url) {
      window.open(url, '_blank');
      
      // Add route info to chat
      if (onServiceSelect) {
        onServiceSelect({
          ...service,
          routeInfo: {
            distance: 'Calculating...',
            duration: 'Calculating...',
            restrictions: truckHeight > 13.5 ? 'Avoiding low bridges' : 'Standard route',
            truckSpecific: true
          }
        });
      }
    }
  };

  if (error) {
    return (
      <div style={{
        height: '300px',
        background: 'rgba(0,0,0,0.3)',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'rgba(255,255,255,0.7)',
        fontSize: '0.9rem'
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: '0 0 8px 0' }}>🗺️ Map Error</p>
          <p style={{ margin: 0, fontSize: '0.8rem' }}>{error}</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div style={{
        height: '300px',
        background: 'rgba(0,0,0,0.3)',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'rgba(255,255,255,0.7)',
        fontSize: '0.9rem'
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: '0 0 8px 0' }}>🗺️ Loading Map...</p>
          <p style={{ margin: 0, fontSize: '0.8rem' }}>Initializing Google Maps</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <div 
        ref={mapRef} 
        style={{ 
          height: '300px', 
          width: '100%', 
          borderRadius: '8px',
          border: '1px solid rgba(255,255,255,0.2)',
          position: 'relative'
        }} 
      />
      
      {/* Map Legend */}
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        background: 'rgba(0,0,0,0.7)',
        color: 'white',
        padding: '8px',
        borderRadius: '4px',
        fontSize: '0.7rem',
        zIndex: 1000
      }}>
        <div style={{ marginBottom: '4px' }}><strong>Legend:</strong></div>
        <div style={{ marginBottom: '2px' }}>🔧 Repair Centers</div>
        <div style={{ marginBottom: '2px' }}>📦 Parts Stores</div>
        <div style={{ marginBottom: '2px' }}>🚛 Towing Services</div>
        <div style={{ marginBottom: '2px' }}>🔵 Your Location</div>
        <div style={{ marginBottom: '2px' }}>🟢 Safe Routes</div>
        <div>🔴 Height Restricted</div>
      </div>
    </div>
  );
};
