import { useEffect, useState } from 'react';
import { DEBUG } from '../utils/debug';
import { env } from '../lib/env';

declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

export function useGoogleMaps() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    DEBUG.info('Google Maps hook initializing...');
    
    // Check if Google Maps is already loaded
    if (window.google && window.google.maps) {
      DEBUG.info('Google Maps already loaded');
      setIsLoaded(true);
      return;
    }

    const loadGoogleMaps = async () => {
      try {
        // Get API key from environment variables
        const apiKey = env.GOOGLE_MAPS_API_KEY;
        
        if (!apiKey || apiKey === '' || apiKey.includes('YOUR_API_KEY')) {
          DEBUG.warn('Google Maps API key not configured, using fallback map');
          setError('Google Maps API not available - using fallback map interface');
          return;
        }

        // Check if script is already loading
        const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
        if (existingScript) {
          DEBUG.info('Google Maps script already exists, waiting for load...');
          existingScript.addEventListener('load', () => {
            DEBUG.info('Google Maps API loaded successfully');
            setIsLoaded(true);
          });
          existingScript.addEventListener('error', () => {
            DEBUG.error('Google Maps script failed to load');
            setError('Failed to load Google Maps API');
          });
          return;
        }

        DEBUG.info('Loading Google Maps API with key:', apiKey.substring(0, 8) + '...');

        // Create script element with proper async loading and marker library
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry,marker&loading=async`;
        script.async = true;
        script.defer = true;
        
        script.onload = () => {
          // Add a small delay to ensure the API is fully initialized
          setTimeout(() => {
            if (window.google && window.google.maps && window.google.maps.Map) {
              DEBUG.info('Google Maps API loaded and initialized successfully');
              setIsLoaded(true);
            } else {
              DEBUG.error('Google Maps API loaded but not properly initialized');
              setError('Google Maps API failed to initialize properly');
            }
          }, 100);
        };
        
        script.onerror = (e) => {
          DEBUG.error('Failed to load Google Maps script:', e);
          setError('Failed to load Google Maps API - check your API key and network connection');
        };

        document.head.appendChild(script);
        DEBUG.info('Google Maps script added to document head');
        
      } catch (err) {
        DEBUG.error('Error loading Google Maps:', err);
        setError('Failed to initialize Google Maps');
      }
    };

    loadGoogleMaps();
  }, []);

  return { isLoaded, error };
}