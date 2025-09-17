/**
 * API Health Check Component
 * Real-time monitoring of API endpoints and services
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  RefreshCw,
  Zap,
  Database,
  Brain,
  Volume2,
  MapPin,
  Shield,
  AlertTriangle
} from 'lucide-react';
import { diagnosticsAPI, authAPI, fleetAPI, reportsAPI } from '../utils/api';
import { env } from '../lib/env';
import { toast } from 'sonner';
import { getErrorMessage } from '../utils/error-handling';

interface HealthStatus {
  service: string;
  endpoint: string;
  status: 'healthy' | 'unhealthy' | 'checking' | 'unknown';
  responseTime?: number;
  lastChecked?: Date;
  error?: string;
  icon: any;
  description: string;
}

export function APIHealthCheck() {
  const [healthStatuses, setHealthStatuses] = useState<HealthStatus[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [lastFullCheck, setLastFullCheck] = useState<Date | null>(null);

  const initialHealthChecks: HealthStatus[] = [
    {
      service: 'Supabase Auth',
      endpoint: '/auth/session',
      status: 'unknown',
      icon: Shield,
      description: 'User authentication and session management'
    },
    {
      service: 'Diagnostics API',
      endpoint: '/diagnostics/history',
      status: 'unknown',
      icon: Zap,
      description: 'Diagnostic data storage and retrieval'
    },
    {
      service: 'Fleet Management',
      endpoint: '/fleet/stats',
      status: 'unknown',
      icon: Database,
      description: 'Fleet statistics and monitoring'
    },
    {
      service: 'Reports Generation',
      endpoint: '/reports/generate',
      status: 'unknown',
      icon: Database,
      description: 'Smart report generation service'
    },
    {
      service: 'AI Analysis',
      endpoint: '/ai/analyze',
      status: 'unknown',
      icon: Brain,
      description: 'GitHub Models AI diagnostic analysis'
    },
    {
      service: 'Google Maps API',
      endpoint: 'maps.googleapis.com',
      status: 'unknown',
      icon: MapPin,
      description: 'Location services and mapping'
    },
    {
      service: 'Audio Processing',
      endpoint: 'MediaDevices API',
      status: 'unknown',
      icon: Volume2,
      description: 'Browser audio recording capabilities'
    }
  ];

  useEffect(() => {
    setHealthStatuses(initialHealthChecks);
    // Run initial health check
    runHealthCheck();
  }, []);

  const runHealthCheck = async () => {
    setIsChecking(true);
    const updatedStatuses: HealthStatus[] = [];

    for (const check of initialHealthChecks) {
      const startTime = Date.now();
      setHealthStatuses(prev => prev.map(status => 
        status.service === check.service 
          ? { ...status, status: 'checking' }
          : status
      ));

      try {
        let result: HealthStatus;
        
        switch (check.service) {
          case 'Supabase Auth':
            result = await checkSupabaseAuth(check, startTime);
            break;
          case 'Diagnostics API':
            result = await checkDiagnosticsAPI(check, startTime);
            break;
          case 'Fleet Management':
            result = await checkFleetAPI(check, startTime);
            break;
          case 'Reports Generation':
            result = await checkReportsAPI(check, startTime);
            break;
          case 'AI Analysis':
            result = await checkAIAPI(check, startTime);
            break;
          case 'Google Maps API':
            result = await checkGoogleMapsAPI(check, startTime);
            break;
          case 'Audio Processing':
            result = await checkAudioAPI(check, startTime);
            break;
          default:
            result = { ...check, status: 'unknown', lastChecked: new Date() };
        }
        
        updatedStatuses.push(result);
        
        // Update UI in real-time
        setHealthStatuses(prev => prev.map(status => 
          status.service === result.service ? result : status
        ));
        
        // Small delay between checks to avoid overwhelming
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        const errorResult: HealthStatus = {
          ...check,
          status: 'unhealthy',
          responseTime: Date.now() - startTime,
          lastChecked: new Date(),
          error: error instanceof Error ? getErrorMessage(error) : String(error)
        };
        updatedStatuses.push(errorResult);
        
        setHealthStatuses(prev => prev.map(status => 
          status.service === errorResult.service ? errorResult : status
        ));
      }
    }

    setIsChecking(false);
    setLastFullCheck(new Date());
    
    const healthyCount = updatedStatuses.filter(s => s.status === 'healthy').length;
    const totalCount = updatedStatuses.length;
    
    if (healthyCount === totalCount) {
      toast.success('All API endpoints are healthy!');
    } else {
      toast.warning(`${healthyCount}/${totalCount} endpoints are healthy`);
    }
  };

  // Individual API health check functions
  const checkSupabaseAuth = async (check: HealthStatus, startTime: number): Promise<HealthStatus> => {
    try {
      await authAPI.getSession();
      return {
        ...check,
        status: 'healthy',
        responseTime: Date.now() - startTime,
        lastChecked: new Date()
      };
    } catch (error) {
      return {
        ...check,
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        error: getErrorMessage(error)
      };
    }
  };

  const checkDiagnosticsAPI = async (check: HealthStatus, startTime: number): Promise<HealthStatus> => {
    try {
      // Try to get diagnostic history (this will fail gracefully if user not authenticated)
      await diagnosticsAPI.getHistory();
      return {
        ...check,
        status: 'healthy',
        responseTime: Date.now() - startTime,
        lastChecked: new Date()
      };
    } catch (error) {
      // If it's an auth error, the API is still healthy
      if (getErrorMessage(error).includes('Unauthorized') || getErrorMessage(error).includes('401')) {
        return {
          ...check,
          status: 'healthy',
          responseTime: Date.now() - startTime,
          lastChecked: new Date(),
          error: 'API healthy (auth required)'
        };
      }
      return {
        ...check,
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        error: getErrorMessage(error)
      };
    }
  };

  const checkFleetAPI = async (check: HealthStatus, startTime: number): Promise<HealthStatus> => {
    try {
      await fleetAPI.getStats();
      return {
        ...check,
        status: 'healthy',
        responseTime: Date.now() - startTime,
        lastChecked: new Date()
      };
    } catch (error) {
      if (getErrorMessage(error).includes('Unauthorized') || getErrorMessage(error).includes('401')) {
        return {
          ...check,
          status: 'healthy',
          responseTime: Date.now() - startTime,
          lastChecked: new Date(),
          error: 'API healthy (auth required)'
        };
      }
      return {
        ...check,
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        error: getErrorMessage(error)
      };
    }
  };

  const checkReportsAPI = async (check: HealthStatus, startTime: number): Promise<HealthStatus> => {
    try {
      // Just check if the method exists and is callable
      if (typeof reportsAPI.generate === 'function') {
        return {
          ...check,
          status: 'healthy',
          responseTime: Date.now() - startTime,
          lastChecked: new Date(),
          error: 'API method available'
        };
      }
      throw new Error('Reports API method not found');
    } catch (error) {
      return {
        ...check,
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        error: getErrorMessage(error)
      };
    }
  };

  const checkAIAPI = async (check: HealthStatus, startTime: number): Promise<HealthStatus> => {
    try {
      // Check if GitHub token is configured
      const githubToken = env.GITHUB_TOKEN;
      if (!githubToken || githubToken === '') {
        return {
          ...check,
          status: 'warning',
          responseTime: Date.now() - startTime,
          lastChecked: new Date(),
          error: 'GitHub API token not configured - AI analysis features will be limited'
        };
      }
      
      // For now, just verify the token exists
      return {
        ...check,
        status: 'healthy',
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        error: 'GitHub token configured'
      };
    } catch (error) {
      return {
        ...check,
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        error: getErrorMessage(error)
      };
    }
  };

  const checkGoogleMapsAPI = async (check: HealthStatus, startTime: number): Promise<HealthStatus> => {
    try {
      const apiKey = env.GOOGLE_MAPS_API_KEY;
      if (!apiKey || apiKey === '' || apiKey.includes('YOUR_API_KEY')) {
        return {
          ...check,
          status: 'unhealthy',
          responseTime: Date.now() - startTime,
          lastChecked: new Date(),
          error: 'Google Maps API key not configured'
        };
      }
      
      return {
        ...check,
        status: 'healthy',
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        error: 'API key configured'
      };
    } catch (error) {
      return {
        ...check,
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        error: getErrorMessage(error)
      };
    }
  };

  const checkAudioAPI = async (check: HealthStatus, startTime: number): Promise<HealthStatus> => {
    try {
      // Check if MediaDevices API is available
      if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
        return {
          ...check,
          status: 'healthy',
          responseTime: Date.now() - startTime,
          lastChecked: new Date(),
          error: 'MediaDevices API available'
        };
      } else {
        return {
          ...check,
          status: 'unhealthy',
          responseTime: Date.now() - startTime,
          lastChecked: new Date(),
          error: 'MediaDevices API not supported'
        };
      }
    } catch (error) {
      return {
        ...check,
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        error: getErrorMessage(error)
      };
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'unhealthy': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'checking': return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500/20 text-green-300 border-green-400/30';
      case 'unhealthy': return 'bg-red-500/20 text-red-300 border-red-400/30';
      case 'checking': return 'bg-blue-500/20 text-blue-300 border-blue-400/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-400/30';
    }
  };

  const healthyCount = healthStatuses.filter(s => s.status === 'healthy').length;
  const unhealthyCount = healthStatuses.filter(s => s.status === 'unhealthy').length;
  const overallHealth = healthyCount / healthStatuses.length;

  return (
    <div className="space-y-6">
      {/* Health Check Header */}
      <Card className="border-glass-border" style={{
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)'
      }}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-white">
                <Shield className="h-5 w-5" />
                API Health Status
              </CardTitle>
              <CardDescription className="text-white/80">
                Real-time monitoring of all API endpoints and services
              </CardDescription>
            </div>
            <Button
              onClick={runHealthCheck}
              disabled={isChecking}
              variant="outline"
              className="glass-subtle border-white/20 text-white hover:bg-white/10"
            >
              {isChecking ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 bg-white/5 rounded-lg">
              <div className="text-2xl font-bold text-green-400">{healthyCount}</div>
              <div className="text-sm text-white/70">Healthy</div>
            </div>
            <div className="text-center p-3 bg-white/5 rounded-lg">
              <div className="text-2xl font-bold text-red-400">{unhealthyCount}</div>
              <div className="text-sm text-white/70">Unhealthy</div>
            </div>
            <div className="text-center p-3 bg-white/5 rounded-lg">
              <div className="text-2xl font-bold text-blue-400">{Math.round(overallHealth * 100)}%</div>
              <div className="text-sm text-white/70">Overall Health</div>
            </div>
          </div>
          
          {lastFullCheck && (
            <p className="text-white/60 text-sm">
              Last checked: {lastFullCheck.toLocaleTimeString()}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Overall Status Alert */}
      <Alert className={overallHealth > 0.8 ? 
        "border-green-400/30 bg-green-500/10" : 
        overallHealth > 0.5 ? "border-yellow-400/30 bg-yellow-500/10" :
        "border-red-400/30 bg-red-500/10"
      }>
        {overallHealth > 0.8 ? (
          <CheckCircle className="h-4 w-4 text-green-400" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-yellow-400" />
        )}
        <AlertDescription className={
          overallHealth > 0.8 ? "text-green-300" : 
          overallHealth > 0.5 ? "text-yellow-300" : "text-red-300"
        }>
          {overallHealth > 0.8 ? (
            "🎉 All critical systems are operational!"
          ) : overallHealth > 0.5 ? (
            `⚠️ Some services need attention. ${healthyCount}/${healthStatuses.length} endpoints healthy.`
          ) : (
            `🚨 Multiple service issues detected. Immediate attention required.`
          )}
        </AlertDescription>
      </Alert>

      {/* Individual Service Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {healthStatuses.map((status, index) => {
          const Icon = status.icon;
          return (
            <Card key={index} className="border-glass-border" style={{
              background: 'rgba(0, 0, 0, 0.4)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)'
            }}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-white/80" />
                    <span className="text-white font-medium">{status.service}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(status.status)}
                    <Badge variant="outline" className={getStatusColor(status.status)}>
                      {status.status.toUpperCase()}
                    </Badge>
                  </div>
                </div>
                
                <p className="text-white/70 text-sm mb-3">{status.description}</p>
                
                <div className="flex justify-between items-center text-xs text-white/60">
                  <span>{status.endpoint}</span>
                  {status.responseTime && (
                    <span>{status.responseTime}ms</span>
                  )}
                </div>
                
                {status.error && (
                  <div className="mt-2 p-2 bg-white/5 rounded text-xs text-white/70">
                    {status.error}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
