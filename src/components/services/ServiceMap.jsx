import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Star, Phone, Navigation, Clock, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons for different service types
const createIcon = (color) => new L.DivIcon({
  className: 'custom-marker',
  html: `<div style="background: ${color}; width: 30px; height: 30px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30]
});

const icons = {
  repair: createIcon('#f97316'),
  parking: createIcon('#3b82f6'),
  towing: createIcon('#ef4444'),
  user: createIcon('#22c55e')
};

function MapController({ center, zoom }) {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);
  
  return null;
}

export default function ServiceMap({ services, userLocation, selectedService, onSelectService, filters }) {
  const [mapCenter, setMapCenter] = useState(userLocation || [39.8283, -98.5795]);

  useEffect(() => {
    if (userLocation) {
      setMapCenter(userLocation);
    }
  }, [userLocation]);

  const filteredServices = services.filter(s => {
    if (filters.repair && s.type === 'repair') return true;
    if (filters.parking && s.type === 'parking') return true;
    if (filters.towing && s.type === 'towing') return true;
    return false;
  });

  return (
    <div className="h-full w-full rounded-xl overflow-hidden border border-white/10">
      <MapContainer
        center={mapCenter}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        
        <MapController center={mapCenter} zoom={12} />

        {userLocation && (
          <Marker position={userLocation} icon={icons.user}>
            <Popup className="custom-popup">
              <div className="text-sm font-medium">Your Location</div>
            </Popup>
          </Marker>
        )}

        {filteredServices.map((service) => (
          <Marker
            key={service.id}
            position={[service.lat, service.lng]}
            icon={icons[service.type]}
            eventHandlers={{
              click: () => onSelectService(service)
            }}
          >
            <Popup className="custom-popup">
              <div className="min-w-[200px] p-1">
                <h3 className="font-semibold text-gray-900">{service.name}</h3>
                <div className="flex items-center gap-1 mt-1">
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm text-gray-600">{service.rating}</span>
                  <span className="text-xs text-gray-400">({service.reviews} reviews)</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{service.address}</p>
                {service.phone && (
                  <a href={`tel:${service.phone}`} className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1">
                    <Phone className="w-3 h-3" />
                    {service.phone}
                  </a>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
