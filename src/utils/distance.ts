/**
 * Shared utility functions for distance calculations
 */

export interface Location {
  lat: number;
  lng: number;
}

/**
 * Calculate distance between two points using Haversine formula
 * @param from Starting location
 * @param to Destination location
 * @returns Distance as a formatted string in miles
 */
export const calculateDistance = (
  from: Location | null, 
  to: Location
): string => {
  if (!from) return 'N/A';
  
  const R = 3959; // Earth's radius in miles
  const dLat = (to.lat - from.lat) * Math.PI / 180;
  const dLng = (to.lng - from.lng) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(from.lat * Math.PI / 180) * Math.cos(to.lat * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return `${distance.toFixed(1)} miles`;
};

/**
 * Calculate estimated drive time based on distance
 * @param from Starting location
 * @param to Destination location
 * @param avgSpeed Average speed in mph (default: 35)
 * @returns Drive time as a formatted string
 */
export const calculateDriveTime = (
  from: Location | null, 
  to: Location, 
  avgSpeed: number = 35
): string => {
  if (!from) return 'N/A';
  
  const distance = parseFloat(calculateDistance(from, to));
  const timeInHours = distance / avgSpeed;
  const minutes = Math.round(timeInHours * 60);
  
  return `${minutes} min drive`;
};

/**
 * Get numeric distance value for sorting
 * @param from Starting location
 * @param to Destination location
 * @returns Distance in miles as a number
 */
export const getDistanceValue = (from: Location | null, to: Location): number => {
  if (!from) return Infinity;
  
  const distanceStr = calculateDistance(from, to);
  return parseFloat(distanceStr.replace(' miles', ''));
};