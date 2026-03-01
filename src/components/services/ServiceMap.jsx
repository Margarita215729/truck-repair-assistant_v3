import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { Star, Phone, AlertTriangle } from 'lucide-react';
import { timeAgo } from '@/services/truckInfraService';
import { useLanguage } from '@/lib/LanguageContext';
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

// Parking icon with occupancy indicator
const createParkingIcon = (occupancyStatus) => {
  const colorMap = { open: '#22c55e', partial: '#eab308', full: '#ef4444', unknown: '#06b6d4' };
  const bg = colorMap[occupancyStatus] || colorMap.unknown;
  return new L.DivIcon({
    className: 'custom-marker',
    html: `<div style="position:relative;">
      <div style="background: ${bg}; width: 30px; height: 30px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>
      <span style="position:absolute; top:-6px; right:-6px; background:#06b6d4; color:white; font-size:9px; font-weight:bold; border-radius:50%; width:16px; height:16px; display:flex; align-items:center; justify-content:center; border:1px solid white;">P</span>
    </div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30]
  });
};

const createWeighIcon = () => new L.DivIcon({
  className: 'custom-marker',
  html: `<div style="position:relative;">
    <div style="background: #a855f7; width: 30px; height: 30px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>
    <span style="position:absolute; top:-6px; right:-6px; background:#7c3aed; color:white; font-size:9px; font-weight:bold; border-radius:50%; width:16px; height:16px; display:flex; align-items:center; justify-content:center; border:1px solid white;">W</span>
  </div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30]
});

const createRestrictionIcon = () => new L.DivIcon({
  className: 'custom-marker',
  html: `<div style="position:relative;">
    <div style="background: #f59e0b; width: 28px; height: 28px; border-radius: 4px; transform: rotate(45deg); border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>
    <span style="position:absolute; top:-4px; right:-6px; background:#d97706; color:white; font-size:11px; font-weight:bold; border-radius:50%; width:16px; height:16px; display:flex; align-items:center; justify-content:center; border:1px solid white;">!</span>
  </div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28]
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

export default function ServiceMap({
  services,
  userLocation,
  selectedService,
  onSelectService,
  filters,
  // New infrastructure data
  truckParking = [],
  weighStations = [],
  restrictions = [],
}) {
  const { t } = useLanguage();
  const [mapCenter, setMapCenter] = useState(userLocation || [39.8283, -98.5795]);

  useEffect(() => {
    if (userLocation) {
      setMapCenter(userLocation);
    }
  }, [userLocation]);

  // Services are already filtered by the parent — use directly
  const filteredServices = services;

  // Restriction segments that have start+end points (for polylines)
  const restrictionSegments = restrictions.filter(r => r.lat_end && r.lng_end);
  const restrictionPoints = restrictions.filter(r => !r.lat_end || !r.lng_end);

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

        {/* User location */}
        {userLocation && (
          <Marker position={userLocation} icon={icons.user}>
            <Popup className="custom-popup">
              <div className="text-sm font-medium">Your Location</div>
            </Popup>
          </Marker>
        )}

        {/* LLM services (repair/parking/towing) */}
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

        {/* ─── Infrastructure Layers ─── */}

        {/* Truck Parking */}
        {filters.showTruckParking && truckParking.map((lot) => (
          <Marker
            key={`parking-${lot.id}`}
            position={[lot.lat, lot.lng]}
            icon={createParkingIcon(lot.occupancy_status)}
          >
            <Popup className="custom-popup">
              <div className="min-w-[220px] p-1">
                <h3 className="font-semibold text-gray-900 flex items-center gap-1">
                  <span>🅿️</span> {lot.name}
                </h3>
                {lot.operator && (
                  <p className="text-xs text-gray-500">{lot.operator}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">{lot.address}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    lot.occupancy_status === 'open' ? 'bg-green-100 text-green-700' :
                    lot.occupancy_status === 'partial' ? 'bg-yellow-100 text-yellow-700' :
                    lot.occupancy_status === 'full' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {lot.occupancy_status === 'open' ? t('services.occupancyOpen') :
                     lot.occupancy_status === 'partial' ? t('services.occupancyPartial') :
                     lot.occupancy_status === 'full' ? t('services.occupancyFull') :
                     t('services.occupancyUnknown')}
                  </span>
                </div>
                {lot.total_spaces > 0 && (
                  <p className="text-xs text-gray-600 mt-1">
                    {lot.available_spaces}/{lot.total_spaces} {t('services.availableSpaces').toLowerCase()} ({lot.occupancy_pct}%)
                  </p>
                )}
                {lot.occupancy_updated_at && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {t('services.lastUpdated')}: {timeAgo(lot.occupancy_updated_at)}
                  </p>
                )}
                {lot.amenities?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {lot.amenities.map((a, i) => (
                      <span key={i} className="bg-blue-50 text-blue-600 text-xs px-1.5 py-0.5 rounded">{a}</span>
                    ))}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Weigh Stations */}
        {filters.showWeighStations && weighStations.map((ws) => (
          <Marker
            key={`weigh-${ws.id}`}
            position={[ws.lat, ws.lng]}
            icon={createWeighIcon()}
          >
            <Popup className="custom-popup">
              <div className="min-w-[200px] p-1">
                <h3 className="font-semibold text-gray-900 flex items-center gap-1">
                  <span>⚖️</span> {ws.name}
                </h3>
                {ws.highway && (
                  <p className="text-xs text-gray-500">{ws.highway} {ws.direction}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">{ws.address}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    ws.status === 'open' ? 'bg-green-100 text-green-700' :
                    ws.status === 'closed' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {ws.status === 'open' ? t('services.weighStationOpen') :
                     ws.status === 'closed' ? t('services.weighStationClosed') :
                     t('services.occupancyUnknown')}
                  </span>
                  {ws.has_prepass && (
                    <span className="bg-purple-50 text-purple-600 text-xs px-1.5 py-0.5 rounded">PrePass</span>
                  )}
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  {ws.scale_type === 'static' ? t('services.scaleTypeStatic') :
                   ws.scale_type === 'weigh_in_motion' ? t('services.scaleTypeWIM') :
                   ws.scale_type === 'both' ? t('services.scaleTypeBoth') : ''}
                </p>
                {ws.hours && <p className="text-xs text-gray-400 mt-0.5">{ws.hours}</p>}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Truck Restrictions — point markers */}
        {filters.showRestrictions && restrictionPoints.map((r) => (
          <Marker
            key={`restrict-${r.id}`}
            position={[r.lat, r.lng]}
            icon={createRestrictionIcon()}
          >
            <Popup className="custom-popup">
              <div className="min-w-[200px] p-1">
                <h3 className="font-semibold text-gray-900 flex items-center gap-1">
                  <span>⚠️</span> {r.name}
                </h3>
                {r.road_name && <p className="text-xs text-gray-500">{r.road_name}</p>}
                {r.description && <p className="text-xs text-gray-600 mt-1">{r.description}</p>}
                <div className="space-y-1 mt-2 text-xs">
                  {r.height_ft && (
                    <p className="text-orange-600 font-medium">
                      {t('services.heightLimit')}: {r.height_ft} {t('services.restrictionFt')}
                    </p>
                  )}
                  {r.weight_tons && (
                    <p className="text-orange-600 font-medium">
                      {t('services.weightLimit')}: {r.weight_tons} {t('services.restrictionTons')}
                    </p>
                  )}
                  {r.width_ft && (
                    <p className="text-orange-600 font-medium">
                      {t('services.widthLimit')}: {r.width_ft} {t('services.restrictionFt')}
                    </p>
                  )}
                </div>
                {r.detour_info && (
                  <p className="text-xs text-blue-600 mt-1">
                    {t('services.detour')}: {r.detour_info}
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Truck Restrictions — polyline segments */}
        {filters.showRestrictions && restrictionSegments.map((r) => (
          <React.Fragment key={`restrict-seg-${r.id}`}>
            <Polyline
              positions={[[r.lat, r.lng], [r.lat_end, r.lng_end]]}
              pathOptions={{
                color: '#f59e0b',
                weight: 4,
                dashArray: '8, 6',
                opacity: 0.8,
              }}
            />
            <Marker
              position={[r.lat, r.lng]}
              icon={createRestrictionIcon()}
            >
              <Popup className="custom-popup">
                <div className="min-w-[200px] p-1">
                  <h3 className="font-semibold text-gray-900">⚠️ {r.name}</h3>
                  {r.road_name && <p className="text-xs text-gray-500">{r.road_name}</p>}
                  <div className="space-y-1 mt-2 text-xs">
                    {r.height_ft && <p className="text-orange-600 font-medium">{t('services.heightLimit')}: {r.height_ft} {t('services.restrictionFt')}</p>}
                    {r.weight_tons && <p className="text-orange-600 font-medium">{t('services.weightLimit')}: {r.weight_tons} {t('services.restrictionTons')}</p>}
                    {r.width_ft && <p className="text-orange-600 font-medium">{t('services.widthLimit')}: {r.width_ft} {t('services.restrictionFt')}</p>}
                  </div>
                  {r.detour_info && <p className="text-xs text-blue-600 mt-1">{t('services.detour')}: {r.detour_info}</p>}
                </div>
              </Popup>
            </Marker>
          </React.Fragment>
        ))}
      </MapContainer>
    </div>
  );
}
