import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { 
  MapPin, 
  Shield, 
  Globe, 
  Settings, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Info,
  ExternalLink,
  Lock,
  Unlock
} from 'lucide-react';

export function GeolocationHelper() {
  const [permissionState, setPermissionState] = useState<'unknown' | 'granted' | 'denied' | 'prompt'>('unknown');
  const [isSecureContext, setIsSecureContext] = useState(false);
  const [protocol, setProtocol] = useState('');

  useEffect(() => {
    // Check secure context
    setIsSecureContext(window.isSecureContext || false);
    setProtocol(window.location.protocol);

    // Check geolocation permission if available
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' as PermissionName }).then((result) => {
        setPermissionState(result.state);
        
        // Listen for permission changes
        result.addEventListener('change', () => {
          setPermissionState(result.state);
        });
      }).catch(() => {
        setPermissionState('unknown');
      });
    }
  }, []);

  const handleRequestPermission = () => {
    if (!navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      () => {
        setPermissionState('granted');
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setPermissionState('denied');
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 300000
      }
    );
  };

  const getPermissionBadge = () => {
    switch (permissionState) {
      case 'granted':
        return (
          <Badge variant="default" className="bg-green-500/20 text-green-300 border-green-400/30">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Granted
          </Badge>
        );
      case 'denied':
        return (
          <Badge variant="destructive" className="bg-red-500/20 text-red-300 border-red-400/30">
            <XCircle className="h-3 w-3 mr-1" />
            Denied
          </Badge>
        );
      case 'prompt':
        return (
          <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-300 border-yellow-400/30">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Not Requested
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="border-white/20 text-white/90">
            Unknown
          </Badge>
        );
    }
  };

  const getSecurityBadge = () => {
    if (isSecureContext) {
      return (
        <Badge variant="default" className="bg-green-500/20 text-green-300 border-green-400/30">
          <Lock className="h-3 w-3 mr-1" />
          Secure (HTTPS)
        </Badge>
      );
    } else {
      return (
        <Badge variant="destructive" className="bg-red-500/20 text-red-300 border-red-400/30">
          <Unlock className="h-3 w-3 mr-1" />
          Insecure (HTTP)
        </Badge>
      );
    }
  };

  return (
    <div className="space-y-4">
      {/* Geolocation Status Card */}
      <Card className="border-glass-border" style={{
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)'
      }}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg">
                <MapPin className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-white">Geolocation Status</CardTitle>
                <CardDescription className="text-white/80">
                  Current browser location access status
                </CardDescription>
              </div>
            </div>
            {getPermissionBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Permission Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-white/80 text-sm">Permission Status:</label>
              <div className="flex items-center gap-2">
                {getPermissionBadge()}
                {permissionState === 'prompt' && (
                  <Button 
                    size="sm" 
                    onClick={handleRequestPermission}
                    className="ml-2"
                  >
                    Request Access
                  </Button>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-white/80 text-sm">Security Context:</label>
              <div className="flex items-center gap-2">
                {getSecurityBadge()}
              </div>
            </div>
          </div>

          {/* Protocol Information */}
          <div className="p-3 bg-white/5 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="h-4 w-4 text-blue-400" />
              <span className="text-white/90 text-sm font-medium">Connection Info</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-white/60">Protocol:</span>
                <span className="text-white ml-2">{protocol}</span>
              </div>
              <div>
                <span className="text-white/60">Secure Context:</span>
                <span className="text-white ml-2">{isSecureContext ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Troubleshooting Alerts */}
      {permissionState === 'denied' && (
        <Alert className="border-red-500/20 bg-red-500/5">
          <XCircle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-red-300">
            <strong>Location Access Denied:</strong> Please enable location access in your browser settings. 
            You may need to click the location icon in your address bar or go to browser settings.
          </AlertDescription>
        </Alert>
      )}

      {!isSecureContext && (
        <Alert className="border-yellow-500/20 bg-yellow-500/5">
          <AlertTriangle className="h-4 w-4 text-yellow-400" />
          <AlertDescription className="text-yellow-300">
            <strong>Insecure Connection:</strong> Location access may be restricted on HTTP connections. 
            For full functionality, please use HTTPS.
          </AlertDescription>
        </Alert>
      )}

      {permissionState === 'granted' && isSecureContext && (
        <Alert className="border-green-500/20 bg-green-500/5">
          <CheckCircle2 className="h-4 w-4 text-green-400" />
          <AlertDescription className="text-green-300">
            <strong>All Good!</strong> Location access is properly configured and working.
          </AlertDescription>
        </Alert>
      )}

      {/* Quick Fix Actions */}
      <Card className="border-glass-border" style={{
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)'
      }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Settings className="h-5 w-5" />
            Quick Fixes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
              className="glass-subtle border-white/20 text-white hover:bg-white/10"
            >
              <Info className="h-4 w-4 mr-2" />
              Refresh Page
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('chrome://settings/content/location', '_blank')}
              className="glass-subtle border-white/20 text-white hover:bg-white/10"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Browser Settings
            </Button>
          </div>
          
          <div className="text-xs text-white/60">
            <p>💡 <strong>Tip:</strong> If location is still not working, try clearing your browser cache or using a different browser.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}