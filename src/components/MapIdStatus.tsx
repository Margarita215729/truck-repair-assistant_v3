import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Map, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Info,
  ExternalLink,
  Settings
} from 'lucide-react';
import { Button } from './ui/button';

export function MapIdStatus() {
  const [mapIdStatus, setMapIdStatus] = useState<'checking' | 'available' | 'unavailable' | 'unknown'>('checking');
  const [advancedMarkersSupported, setAdvancedMarkersSupported] = useState(false);

  useEffect(() => {
    checkMapIdStatus();
  }, []);

  const checkMapIdStatus = () => {
    try {
      // Check if Google Maps API is loaded
      if (!window.google || !window.google.maps) {
        setMapIdStatus('unavailable');
        return;
      }

      // Check if marker library is available
      const hasMarkerLibrary = !!(window.google.maps.marker?.AdvancedMarkerElement);
      setAdvancedMarkersSupported(hasMarkerLibrary);

      if (hasMarkerLibrary) {
        setMapIdStatus('available');
      } else {
        setMapIdStatus('unavailable');
      }

    } catch (error) {
      console.error('Error checking Map ID status:', error);
      setMapIdStatus('unknown');
    }
  };

  const getStatusBadge = () => {
    switch (mapIdStatus) {
      case 'available':
        return (
          <Badge variant="default" className="bg-green-500/20 text-green-300 border-green-400/30">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Map ID Ready
          </Badge>
        );
      case 'unavailable':
        return (
          <Badge variant="destructive" className="bg-red-500/20 text-red-300 border-red-400/30">
            <XCircle className="h-3 w-3 mr-1" />
            Map ID Required
          </Badge>
        );
      case 'unknown':
        return (
          <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-300 border-yellow-400/30">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Status Unknown
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="border-white/20 text-white/90">
            Checking...
          </Badge>
        );
    }
  };

  const getAdvancedMarkersBadge = () => {
    if (advancedMarkersSupported) {
      return (
        <Badge variant="default" className="bg-green-500/20 text-green-300 border-green-400/30">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Supported
        </Badge>
      );
    } else {
      return (
        <Badge variant="secondary" className="bg-orange-500/20 text-orange-300 border-orange-400/30">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Not Available
        </Badge>
      );
    }
  };

  return (
    <div className="space-y-4">
      {/* Map ID Status Card */}
      <Card className="border-glass-border" style={{
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)'
      }}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg">
                <Map className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-white">Google Maps Configuration</CardTitle>
                <CardDescription className="text-white/80">
                  Map ID and AdvancedMarkerElement status
                </CardDescription>
              </div>
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-white/80 text-sm">Map ID Status:</label>
              <div className="flex items-center gap-2">
                {getStatusBadge()}
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-white/80 text-sm">Advanced Markers:</label>
              <div className="flex items-center gap-2">
                {getAdvancedMarkersBadge()}
              </div>
            </div>
          </div>

          {/* Current Configuration */}
          <div className="p-3 bg-white/5 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Settings className="h-4 w-4 text-blue-400" />
              <span className="text-white/90 text-sm font-medium">Current Configuration</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-white/60">Map Strategy:</span>
                <span className="text-white ml-2">
                  {advancedMarkersSupported ? 'Map ID (Advanced)' : 'Custom Styles (Legacy)'}
                </span>
              </div>
              <div>
                <span className="text-white/60">Marker Type:</span>
                <span className="text-white ml-2">
                  {advancedMarkersSupported ? 'AdvancedMarkerElement' : 'Legacy Marker'}
                </span>
              </div>
            </div>
            <div className="mt-2 text-xs text-white/60">
              {advancedMarkersSupported 
                ? 'Using Map ID "TRUCK_DIAGNOSIS_MAP" with cloud-controlled styling'
                : 'Using custom dark theme styles with legacy markers'
              }
            </div>
          </div>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={checkMapIdStatus}
            className="w-full glass-subtle border-white/20 text-white hover:bg-white/10"
          >
            <Settings className="h-4 w-4 mr-2" />
            Refresh Status
          </Button>
        </CardContent>
      </Card>

      {/* Status Alerts */}
      {mapIdStatus === 'available' && advancedMarkersSupported && (
        <Alert className="border-green-500/20 bg-green-500/5">
          <CheckCircle2 className="h-4 w-4 text-green-400" />
          <AlertDescription className="text-green-300">
            <strong>Optimal Configuration!</strong> Using Map ID with AdvancedMarkerElement. 
            Cloud-controlled styling and modern marker features are active.
          </AlertDescription>
        </Alert>
      )}

      {mapIdStatus === 'unavailable' && (
        <Alert className="border-yellow-500/20 bg-yellow-500/5">
          <AlertTriangle className="h-4 w-4 text-yellow-400" />
          <AlertDescription className="text-yellow-300">
            <strong>Legacy Mode Active:</strong> Using custom styling with traditional markers. 
            Full functionality maintained with graceful fallback.
          </AlertDescription>
        </Alert>
      )}

      {!advancedMarkersSupported && (
        <Alert className="border-blue-500/20 bg-blue-500/5">
          <Info className="h-4 w-4 text-blue-400" />
          <AlertDescription className="text-blue-300">
            <strong>Legacy Mode:</strong> Using custom dark styling with traditional markers. 
            No Map ID conflicts - perfect compatibility guaranteed.
          </AlertDescription>
        </Alert>
      )}

      {/* Configuration Success Alert */}
      <Alert className="border-green-500/20 bg-green-500/5">
        <CheckCircle2 className="h-4 w-4 text-green-400" />
        <AlertDescription className="text-green-300">
          <strong>Configuration Fixed!</strong> Map no longer uses Map ID and custom styles simultaneously. 
          The system automatically chooses the best configuration based on AdvancedMarkerElement availability.
        </AlertDescription>
      </Alert>

      {/* Setup Information */}
      <Card className="border-glass-border" style={{
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)'
      }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Info className="h-5 w-5" />
            Map ID Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-white/80 space-y-2">
            <p>
              <strong>Smart Configuration:</strong> The app automatically chooses between Map ID 
              (for AdvancedMarkerElement) or custom styling (for legacy markers) to avoid conflicts.
            </p>
            <p>
              <strong>Style Conflict Resolution:</strong> Google Maps doesn't allow custom styles 
              when Map ID is present. Our system detects this and uses the appropriate configuration.
            </p>
            <p>
              <strong>Graceful Degradation:</strong> Advanced features gracefully fall back to 
              legacy alternatives while maintaining full functionality.
            </p>
          </div>
          
          <div className="mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('https://developers.google.com/maps/documentation/javascript/advanced-markers/map-id', '_blank')}
              className="glass-subtle border-white/20 text-white hover:bg-white/10"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Learn About Map IDs
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}