import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  MapPin, 
  Key, 
  Globe,
  Loader2,
  RefreshCw,
  Settings,
  ExternalLink,
  Info
} from 'lucide-react';
import { GoogleMap } from './GoogleMap';
import { useGoogleMaps } from '../hooks/useGoogleMaps';
import { ApiKeySetup } from './ApiKeySetup';
import { GithubTokenSetup } from './GithubTokenSetup';
import { GeolocationHelper } from './GeolocationHelper';
import { MapIdStatus } from './MapIdStatus';
import { FixedErrorsStatus } from './FixedErrorsStatus';
import { DEBUG, ENV_CHECK } from '../utils/debug';
import { env } from '../lib/env';

export function MapTestingDashboard() {
  const { isLoaded, error } = useGoogleMaps();
  const [apiKeyStatus, setApiKeyStatus] = useState<'unknown' | 'valid' | 'invalid' | 'missing'>('unknown');
  const [isTestingLocation, setIsTestingLocation] = useState(false);
  const [locationTest, setLocationTest] = useState<{
    success: boolean;
    lat?: number;
    lng?: number;
    error?: string;
  } | null>(null);

  const testLocations = [
    {
      id: 1,
      name: 'Test Repair Shop',
      address: '1245 Industrial Blvd, Houston, TX 77032',
      lat: 29.7847,
      lng: -95.2735,
      type: 'repair' as const,
      rating: 4.8,
      phone: '(713) 555-0123',
      services: ['Engine Repair', 'Brake Service'],
      available: true,
      distance: '0.8 miles'
    }
  ];

  // Test API key by checking environment variables
  useEffect(() => {
    const testApiKey = () => {
      try {
        const apiKey = env.GOOGLE_MAPS_API_KEY;
        
        if (!apiKey || apiKey === '') {
          setApiKeyStatus('missing');
          DEBUG.info('API Key Test: No key found in environment');
        } else if (apiKey.includes('YOUR_API_KEY') || apiKey.length < 30) {
          setApiKeyStatus('invalid');
          DEBUG.info('API Key Test: Invalid key format');
        } else {
          setApiKeyStatus('valid');
          DEBUG.info('API Key Test: Valid key found, length:', apiKey.length);
        }
        
      } catch (err) {
        DEBUG.error('API Key Test Failed:', err);
        setApiKeyStatus('missing');
      }
    };

    testApiKey();
  }, []);

  const handleLocationTest = () => {
    setIsTestingLocation(true);
    setLocationTest(null);

    if (!navigator.geolocation) {
      const errorMsg = 'Geolocation not supported by this browser';
      setLocationTest({
        success: false,
        error: errorMsg
      });
      setIsTestingLocation(false);
      DEBUG.error('Location Test Failed:', errorMsg);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const result = {
          success: true,
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setLocationTest(result);
        setIsTestingLocation(false);
        DEBUG.info('Location Test Success:', {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      },
      (error) => {
        let errorMessage = 'Unknown geolocation error';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            if (error.message.includes('permissions policy')) {
              errorMessage = 'Location blocked by browser permissions policy. Please enable location access in browser settings or use HTTPS.';
            } else {
              errorMessage = 'Location access denied. Please allow location access in your browser and try again.';
            }
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable. Please check your GPS/network connection.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. Please try again or check your connection.';
            break;
          default:
            errorMessage = error.message || 'Unknown geolocation error occurred';
            break;
        }
        
        const result = {
          success: false,
          error: errorMessage
        };
        setLocationTest(result);
        setIsTestingLocation(false);
        DEBUG.error('Location Test Failed:', {
          code: error.code,
          message: error.message,
          finalMessage: errorMessage
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000
      }
    );
  };

  const getStatusBadge = (status: string, isSuccess: boolean) => {
    return (
      <Badge variant={isSuccess ? "default" : "destructive"} className="ml-2">
        {isSuccess ? (
          <CheckCircle2 className="h-3 w-3 mr-1" />
        ) : (
          <XCircle className="h-3 w-3 mr-1" />
        )}
        {status}
      </Badge>
    );
  };

  const openGoogleCloudConsole = () => {
    window.open('https://console.cloud.google.com/apis/credentials', '_blank');
  };

  const openMapsDocumentation = () => {
    window.open('https://developers.google.com/maps/documentation/javascript/overview', '_blank');
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <Card className="border-glass-border" style={{
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)'
      }}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-white">
                <Settings className="h-5 w-5" />
                Google Maps Integration Testing
              </CardTitle>
              <CardDescription className="text-white/80">
                Comprehensive testing dashboard with fixes for Service Locator integration
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.location.reload()}
              className="glass-subtle border-white/20 text-white hover:bg-white/10"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Tests
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Fixes Applied Notice */}
      <Card className="border-green-500/20 bg-green-500/5" style={{
        background: 'rgba(0, 50, 0, 0.3)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)'
      }}>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-green-300 font-medium mb-2">🔧 Latest Fixes Applied</h3>
              <ul className="space-y-1 text-sm text-green-200/90">
                <li>• ✅ Fixed Google Maps styles conflict when Map ID is present</li>
                <li>• ✅ Implemented smart configuration: Map ID OR custom styles (not both)</li>
                <li>• ✅ Enhanced geolocation error handling with detailed error info</li>
                <li>• ✅ Added proper permissions policy error detection</li>
                <li>• ✅ Improved error logging with contextual debugging data</li>
                <li>• ✅ Automatic fallback from AdvancedMarkers to legacy markers</li>
              </ul>
              <p className="text-xs text-green-300/70 mt-2">
                🚛 Google Maps now properly handles Map ID vs custom styling, with enhanced geolocation error reporting.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* API Key Status */}
        <Card className="border-glass-border" style={{
          background: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)'
        }}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-white text-lg">
              <Key className="h-5 w-5" />
              API Key
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-white/80 text-sm">Status:</span>
              {apiKeyStatus === 'unknown' ? (
                <Badge variant="secondary">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Testing...
                </Badge>
              ) : apiKeyStatus === 'valid' ? (
                getStatusBadge('Valid', true)
              ) : apiKeyStatus === 'invalid' ? (
                getStatusBadge('Invalid', false)
              ) : (
                getStatusBadge('Missing', false)
              )}
            </div>
            
            {apiKeyStatus !== 'valid' && (
              <div className="mt-3">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={openGoogleCloudConsole}
                  className="w-full glass-subtle border-white/20 text-white hover:bg-white/10"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Setup API Key
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Google Maps Loading Status */}
        <Card className="border-glass-border" style={{
          background: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)'
        }}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-white text-lg">
              <Globe className="h-5 w-5" />
              Maps API
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-white/80 text-sm">Status:</span>
              {!isLoaded && !error ? (
                <Badge variant="secondary">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Loading...
                </Badge>
              ) : isLoaded ? (
                getStatusBadge('Loaded', true)
              ) : (
                getStatusBadge('Failed', false)
              )}
            </div>
            
            {error && (
              <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-red-300 text-xs">
                {error}
              </div>
            )}
            
            <div className="mt-3">
              <Button 
                variant="outline" 
                size="sm"
                onClick={openMapsDocumentation}
                className="w-full glass-subtle border-white/20 text-white hover:bg-white/10"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Docs
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Geolocation Test */}
        <Card className="border-glass-border" style={{
          background: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)'
        }}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-white text-lg">
              <MapPin className="h-5 w-5" />
              Geolocation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-3">
              <span className="text-white/80 text-sm">Test:</span>
              {isTestingLocation ? (
                <Badge variant="secondary">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Testing...
                </Badge>
              ) : locationTest ? (
                getStatusBadge(locationTest.success ? 'Success' : 'Failed', locationTest.success)
              ) : (
                <Badge variant="outline" className="border-white/20 text-white/90">
                  Not Tested
                </Badge>
              )}
            </div>
            
            {locationTest && !locationTest.success && locationTest.error && (
              <div className="mb-3 p-2 bg-red-500/10 border border-red-500/20 rounded text-red-300 text-xs">
                {locationTest.error}
              </div>
            )}
            
            {locationTest && locationTest.success && (
              <div className="mb-3 p-2 bg-green-500/10 border border-green-500/20 rounded text-green-300 text-xs">
                Lat: {locationTest.lat?.toFixed(4)}<br />
                Lng: {locationTest.lng?.toFixed(4)}
              </div>
            )}
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleLocationTest}
              disabled={isTestingLocation}
              className="w-full glass-subtle border-white/20 text-white hover:bg-white/10"
            >
              {isTestingLocation ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <MapPin className="h-4 w-4 mr-2" />
              )}
              Test Location
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Map Test */}
      <Card className="border-glass-border" style={{
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)'
      }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <MapPin className="h-5 w-5" />
            Interactive Map Test
          </CardTitle>
          <CardDescription className="text-white/80">
            Live test of Google Maps integration with sample service locations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GoogleMap
            locations={testLocations}
            userLocation={locationTest?.success ? { 
              lat: locationTest.lat!, 
              lng: locationTest.lng! 
            } : undefined}
            onLocationSelect={(location) => {
              DEBUG.info('Location selected in test:', location);
            }}
            className="h-64 sm:h-80 md:h-96 rounded-xl overflow-hidden border border-white/20 shadow-2xl"
          />
        </CardContent>
      </Card>

      {/* Detailed Testing Tabs */}
      <Tabs defaultValue="fixes" className="space-y-4">
        <TabsList className="grid w-full grid-cols-7 glass-subtle border-white/20">
          <TabsTrigger value="fixes" className="data-[state=active]:bg-white/15 data-[state=active]:text-white text-white/80 hover:text-white">Fixes</TabsTrigger>
          <TabsTrigger value="overview" className="data-[state=active]:bg-white/15 data-[state=active]:text-white text-white/80 hover:text-white">Overview</TabsTrigger>
          <TabsTrigger value="maps-setup" className="data-[state=active]:bg-white/15 data-[state=active]:text-white text-white/80 hover:text-white">Maps API</TabsTrigger>
          <TabsTrigger value="map-id" className="data-[state=active]:bg-white/15 data-[state=active]:text-white text-white/80 hover:text-white">Map ID</TabsTrigger>
          <TabsTrigger value="geolocation" className="data-[state=active]:bg-white/15 data-[state=active]:text-white text-white/80 hover:text-white">Location</TabsTrigger>
          <TabsTrigger value="ai-setup" className="data-[state=active]:bg-white/15 data-[state=active]:text-white text-white/80 hover:text-white">AI Setup</TabsTrigger>
          <TabsTrigger value="troubleshooting" className="data-[state=active]:bg-white/15 data-[state=active]:text-white text-white/80 hover:text-white">Troubleshooting</TabsTrigger>
        </TabsList>

        <TabsContent value="fixes">
          <FixedErrorsStatus />
        </TabsContent>

        <TabsContent value="overview">
          {/* Environment Info */}
          <Card className="border-glass-border" style={{
            background: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)'
          }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Info className="h-5 w-5" />
                Environment Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="p-3 bg-white/5 rounded-lg">
                  <span className="text-white/60 block mb-1">Protocol:</span>
                  <div className="text-white font-medium">{window.location.protocol}</div>
                </div>
                <div className="p-3 bg-white/5 rounded-lg">
                  <span className="text-white/60 block mb-1">Hostname:</span>
                  <div className="text-white font-medium">{window.location.hostname}</div>
                </div>
                <div className="p-3 bg-white/5 rounded-lg">
                  <span className="text-white/60 block mb-1">Geolocation:</span>
                  <div className="text-white font-medium">
                    {ENV_CHECK.isGeolocationSupported() ? (
                      <span className="text-green-400">✓ Supported</span>
                    ) : (
                      <span className="text-red-400">✗ Not Supported</span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maps-setup">
          <ApiKeySetup />
        </TabsContent>

        <TabsContent value="map-id">
          <MapIdStatus />
        </TabsContent>

        <TabsContent value="geolocation">
          <GeolocationHelper />
        </TabsContent>

        <TabsContent value="ai-setup">
          <GithubTokenSetup />
        </TabsContent>

        <TabsContent value="troubleshooting">
          <Card className="border-glass-border" style={{
            background: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)'
          }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <AlertCircle className="h-5 w-5" />
                Common Issues & Solutions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Common Issues */}
                <div>
                  <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-400" />
                    Common Issues
                  </h4>
                  <ul className="space-y-3 text-sm text-white/80">
                    <li className="flex items-start gap-2 p-2 bg-red-500/5 rounded">
                      <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                      <span>API key not configured in environment variables</span>
                    </li>
                    <li className="flex items-start gap-2 p-2 bg-red-500/5 rounded">
                      <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                      <span>API key lacks proper Maps JavaScript API permissions</span>
                    </li>
                    <li className="flex items-start gap-2 p-2 bg-red-500/5 rounded">
                      <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                      <span>Browser blocking location access</span>
                    </li>
                    <li className="flex items-start gap-2 p-2 bg-red-500/5 rounded">
                      <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                      <span>HTTPS required for geolocation</span>
                    </li>
                  </ul>
                </div>

                {/* Solutions */}
                <div>
                  <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                    Quick Fixes
                  </h4>
                  <ul className="space-y-3 text-sm text-white/80">
                    <li className="flex items-start gap-2 p-2 bg-green-500/5 rounded">
                      <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <span>Set GOOGLE_MAPS_API_KEY environment variable</span>
                    </li>
                    <li className="flex items-start gap-2 p-2 bg-green-500/5 rounded">
                      <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <span>Enable Maps JavaScript API in Google Cloud Console</span>
                    </li>
                    <li className="flex items-start gap-2 p-2 bg-green-500/5 rounded">
                      <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <span>Allow location access in browser settings</span>
                    </li>
                    <li className="flex items-start gap-2 p-2 bg-green-500/5 rounded">
                      <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <span>Ensure app is served over HTTPS</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}