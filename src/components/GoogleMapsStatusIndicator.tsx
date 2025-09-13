import { useState, useEffect } from 'react';
import { Badge } from './ui/badge';
import { CheckCircle2, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import { env } from '../lib/safe-env';

export function GoogleMapsStatusIndicator() {
  const [status, setStatus] = useState<'checking' | 'available' | 'unavailable' | 'error'>('checking');

  useEffect(() => {
    checkGoogleMapsStatus();
  }, []);

  const checkGoogleMapsStatus = async () => {
    try {
      setStatus('checking');
      
      // Check if API key is available in environment
      const apiKey = env.GOOGLE_MAPS_API_KEY;
      
      if (!apiKey || apiKey === '' || apiKey.includes('YOUR_API_KEY')) {
        setStatus('unavailable');
        return;
      }
      
      // If we have a key, mark as available
      // (We don't test loading the actual Google Maps API here to avoid quota usage)
      setStatus('available');
      
    } catch (error) {
      setStatus('error');
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'checking':
        return (
          <Badge variant="secondary" className="bg-gray-500/20 text-gray-300 border-gray-400/30">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Checking...
          </Badge>
        );
      case 'available':
        return (
          <Badge variant="default" className="bg-green-500/20 text-green-300 border-green-400/30">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Ready
          </Badge>
        );
      case 'unavailable':
        return (
          <Badge variant="secondary" className="bg-orange-500/20 text-orange-300 border-orange-400/30">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Setup Required
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive" className="bg-red-500/20 text-red-300 border-red-400/30">
            <XCircle className="h-3 w-3 mr-1" />
            Error
          </Badge>
        );
      default:
        return null;
    }
  };

  return getStatusBadge();
}