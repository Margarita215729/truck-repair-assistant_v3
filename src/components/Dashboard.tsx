import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Mic, 
  Search, 
  TrendingUp, 
  Wrench,
  MapPin,
  FileText,
  Volume2,
  Zap,
  Shield,
  Truck,
  Settings
} from 'lucide-react';
import { fleetAPI, diagnosticsAPI } from '../utils/api';
import { useAuth } from './AuthProvider';
import { GoogleMapsStatusIndicator } from './GoogleMapsStatusIndicator';
import { toast } from 'sonner';

interface DashboardProps {
  setActiveTab: (tab: string) => void;
}

// Helper function to calculate system health
const calculateSystemHealth = (diagnostics: any[]): number => {
  if (!diagnostics.length) return 85; // Default good health
  
  const criticalIssues = diagnostics.filter(d => d.primaryIssue?.severity === 'critical').length;
  const totalIssues = diagnostics.length;
  
  return Math.max(10, 100 - (criticalIssues / totalIssues) * 50);
};

export function Dashboard({ setActiveTab }: DashboardProps) {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalDiagnostics: 0,
    activeIssues: 3,
    resolvedToday: 12,
    pendingAnalysis: 7,
    systemHealth: 94
  });
  const [recentDiagnostics, setRecentDiagnostics] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load real fleet statistics
      const fleetStats = await fleetAPI.getStats().catch(error => {
        console.warn('Fleet API not available, using default stats:', error);
        return {
          totalDiagnostics: 0,
          activeIssues: 0,
          resolvedToday: 0,
          pendingAnalysis: 0,
          systemHealth: 100
        };
      });
      
      // Load real diagnostic history
      const diagnosticHistory = await diagnosticsAPI.getHistory().catch(error => {
        console.warn('Diagnostics API not available, using empty history:', error);
        return { diagnostics: [] };
      });
      
      // If we got real data, use it; otherwise use calculated stats
      const realStats = {
        totalDiagnostics: diagnosticHistory.diagnostics?.length || 0,
        activeIssues: diagnosticHistory.diagnostics?.filter((d: any) => 
          d.status === 'pending' || d.primaryIssue?.severity === 'critical'
        ).length || 0,
        resolvedToday: diagnosticHistory.diagnostics?.filter((d: any) => {
          const today = new Date().toDateString();
          const diagDate = new Date(d.timestamp).toDateString();
          return diagDate === today && d.status === 'completed';
        }).length || 0,
        pendingAnalysis: diagnosticHistory.diagnostics?.filter((d: any) => 
          d.status === 'analyzing' || d.status === 'pending'
        ).length || 0,
        systemHealth: calculateSystemHealth(diagnosticHistory.diagnostics || [])
      };
      
      setStats(realStats);
      setRecentDiagnostics(diagnosticHistory.diagnostics?.slice(0, 4) || []);
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
      
      // Use default stats if everything fails
      setStats({
        totalDiagnostics: 0,
        activeIssues: 0,
        resolvedToday: 0,
        pendingAnalysis: 0,
        systemHealth: 100
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Calculate system health based on diagnostic history
   */
  const calculateSystemHealth = (diagnostics: any[]): number => {
    if (diagnostics.length === 0) return 100;
    
    let healthScore = 100;
    const recentDiagnostics = diagnostics.filter(d => {
      const diagDate = new Date(d.timestamp);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return diagDate > weekAgo;
    });
    
    recentDiagnostics.forEach(diagnostic => {
      if (diagnostic.primaryIssue?.severity === 'critical') {
        healthScore -= 20;
      } else if (diagnostic.primaryIssue?.severity === 'severe') {
        healthScore -= 10;
      } else if (diagnostic.primaryIssue?.severity === 'moderate') {
        healthScore -= 5;
      }
    });
    
    return Math.max(0, Math.min(100, healthScore));
  };

  const diagnosticStats = [
    {
      title: 'Current Issues',
      value: stats.activeIssues.toString(),
      description: 'Problems needing attention',
      icon: AlertTriangle,
      color: 'destructive',
      trend: 'Check engine status'
    },
    {
      title: 'Fixed This Trip',
      value: stats.resolvedToday.toString(),
      description: 'Issues resolved on the road',
      icon: CheckCircle,
      color: 'default',
      trend: 'Safe to continue'
    },
    {
      title: 'AI Analysis',
      value: stats.pendingAnalysis.toString(),
      description: 'Smart diagnosis in progress',
      icon: Clock,
      color: 'secondary',
      trend: 'Processing symptoms'
    },
    {
      title: 'Truck Health',
      value: `${stats.systemHealth}%`,
      description: 'Overall truck condition',
      icon: Activity,
      color: 'default',
      trend: 'Ready for the road'
    }
  ];

  const quickActions = [
    {
      title: 'Engine Sound Analysis',
      description: 'Record engine sound for AI diagnostic analysis',
      icon: Volume2,
      shortText: 'SOUND',
      action: () => setActiveTab('sound'),
      badge: 'AI Powered'
    },
    {
      title: 'AI Diagnostics',
      description: 'GitHub Models powered analysis',
      icon: Zap,
      shortText: 'AI',
      action: () => setActiveTab('analysis'),
      badge: 'GitHub AI'
    },
    {
      title: 'Smart Reports',
      description: 'Comprehensive diagnostic reports with cost analysis',
      icon: FileText,
      shortText: 'REPORTS',
      action: () => setActiveTab('reports'),
      badge: 'Detailed'
    },
    {
      title: 'Service Locator',
      description: 'Find repair shops & tow trucks nearby',
      icon: MapPin,
      shortText: 'HELP',
      action: () => setActiveTab('locations'),
      badge: 'GPS Ready'
    }
  ];

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
      return 'Recently';
    }
  };

  const mockRecentDiagnostics = [
    {
      id: '1',
      type: 'Engine Sound',
      issue: 'Unusual knocking sound detected',
      severity: 'High',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      status: 'Analyzed'
    },
    {
      id: '2',
      type: 'Visual Check',
      issue: 'Brake fluid level low',
      severity: 'Medium',
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
      status: 'Resolved'
    },
    {
      id: '3',
      type: 'Performance',
      issue: 'Fuel efficiency decreased',
      severity: 'Low',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      status: 'Monitoring'
    }
  ];

  return (
    <div className="w-full max-w-7xl mx-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 md:space-y-8">
      {/* Welcome Section */}
      <div className="relative">
        <div className="rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 border border-white/20 backdrop-blur-xl" style={{
          background: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)'
        }}>
          <div className="flex flex-col sm:flex-row items-start gap-3 md:gap-4 mb-4">
            <div className="relative flex-shrink-0 mx-auto sm:mx-0">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full blur opacity-75" />
              <div className="relative w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <Truck className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-white drop-shadow-lg" />
              </div>
            </div>
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-white mb-1 md:mb-2">Welcome Back, Driver</h2>
              <p className="text-white/90 text-sm sm:text-base lg:text-lg leading-relaxed">
                AI-powered truck diagnostics for roadside emergencies. Get instant help when your truck breaks down.
              </p>
            </div>
          </div>
          <div className="h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-orange-500 rounded-full opacity-60" />
        </div>
      </div>

      {/* Quick Actions */}
      <Card className="border border-white/20 rounded-xl sm:rounded-2xl backdrop-blur-xl" style={{
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)'
      }}>
        <CardHeader className="pb-4 md:pb-6">
          <div className="flex flex-col sm:flex-row items-start gap-3">
            <div className="p-2.5 md:p-3 bg-gradient-to-r from-red-500 to-orange-500 rounded-xl flex-shrink-0 mx-auto sm:mx-0">
              <Wrench className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <CardTitle className="text-lg sm:text-xl md:text-2xl font-bold text-white">Emergency Actions</CardTitle>
              <CardDescription className="text-white/80 text-sm md:text-base">Get help fast when your truck breaks down</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              const colors = [
                'from-red-500 to-orange-500',
                'from-blue-500 to-cyan-500',
                'from-green-500 to-emerald-500', 
                'from-purple-500 to-pink-500',
                'from-indigo-500 to-blue-500'
              ];
              const badgeColors = [
                'bg-red-500/20 text-red-300 border-red-400/30',
                'bg-blue-500/20 text-blue-300 border-blue-400/30',
                'bg-green-500/20 text-green-300 border-green-400/30',
                'bg-purple-500/20 text-purple-300 border-purple-400/30',
                'bg-indigo-500/20 text-indigo-300 border-indigo-400/30'
              ];
              return (
                <Button
                  key={action.title}
                  variant="outline"
                  onClick={action.action}
                  className="group h-auto p-4 sm:p-5 md:p-6 flex flex-col items-start gap-3 md:gap-4 glass-subtle hover:scale-102 transition-all duration-500 border border-white/20 rounded-xl backdrop-blur-xl hover:shadow-xl hover:shadow-blue-500/20 bg-white/5 hover:bg-white/10"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className={`px-3 py-2 md:px-4 md:py-2.5 rounded-lg bg-gradient-to-br ${colors[index]} shadow-lg group-hover:shadow-xl transition-shadow duration-300 flex-shrink-0`}>
                      <div className="text-white font-bold text-xs md:text-sm tracking-wider drop-shadow-sm">
                        {action.shortText}
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-xs font-medium px-2 py-1 ${badgeColors[index]} flex-shrink-0`}>
                      {action.badge}
                    </Badge>
                  </div>
                  <div className="text-left w-full min-w-0">
                    <div className="font-bold text-white mb-1 text-sm sm:text-base leading-tight">{action.title}</div>
                    <div className="sm:text-sm text-white/70 leading-relaxed break-words font-[Encode_Sans_Expanded] text-[11px]">{action.description}</div>
                  </div>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>
      {/* System Status Footer */}
      <Card className="border border-white/20 rounded-xl backdrop-blur-xl" style={{
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)'
      }}>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg">
                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <div className="text-center sm:text-left">
                <p className="font-medium text-white text-sm sm:text-base">System Status: All Systems Operational</p>
                <p className="text-xs sm:text-sm text-white/70">AI diagnostics ready • GPS active • Emergency services connected</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-white/60">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Online</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
