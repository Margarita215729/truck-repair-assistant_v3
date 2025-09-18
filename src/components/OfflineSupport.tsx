import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { WifiOff, Wifi, RefreshCw, Download, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface OfflineDiagnostic {
  id: string;
  timestamp: number;
  symptoms: string;
  errorCode: string;
  soundLocation: string;
  truckMake: string;
  truckModel: string;
  hasAudioRecording: boolean;
  status: 'pending' | 'synced' | 'failed';
}

// Global type for window object
declare global {
  interface Window {
    offlineSupport?: {
      addPendingDiagnostic: (diagnostic: Omit<OfflineDiagnostic, 'id' | 'timestamp' | 'status'>) => void;
    };
  }
}

export function OfflineSupport() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingDiagnostics, setPendingDiagnostics] = useState<OfflineDiagnostic[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Load pending diagnostics from localStorage
    loadPendingDiagnostics();
    
    // Make addPendingDiagnostic available globally
    window.offlineSupport = {
      addPendingDiagnostic
    };

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('🌐 Connection restored');
      // Auto-sync when coming back online
      syncPendingDiagnostics();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.info('📱 Working in offline mode');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      // Clean up global reference
      if (window.offlineSupport) {
        delete window.offlineSupport;
      }
    };
  }, []);

  const loadPendingDiagnostics = () => {
    try {
      const stored = localStorage.getItem('pendingDiagnostics');
      if (stored) {
        const diagnostics = JSON.parse(stored) as OfflineDiagnostic[];
        setPendingDiagnostics(diagnostics);
      }
    } catch (error) {
      console.error('[Offline] Error loading pending diagnostics:', error);
    }
  };

  const savePendingDiagnostics = (diagnostics: OfflineDiagnostic[]) => {
    try {
      localStorage.setItem('pendingDiagnostics', JSON.stringify(diagnostics));
      setPendingDiagnostics(diagnostics);
    } catch (error) {
      console.error('[Offline] Error saving pending diagnostics:', error);
    }
  };

  const addPendingDiagnostic = (diagnostic: Omit<OfflineDiagnostic, 'id' | 'timestamp' | 'status'>) => {
    const newDiagnostic: OfflineDiagnostic = {
      ...diagnostic,
      id: Date.now().toString(),
      timestamp: Date.now(),
      status: 'pending'
    };

    const updated = [...pendingDiagnostics, newDiagnostic];
    savePendingDiagnostics(updated);
    
    toast.info('💾 Диагностика сохранена для отправки при восстановлении связи');
  };

  const syncPendingDiagnostics = async () => {
    if (!isOnline || pendingDiagnostics.length === 0) {
      return;
    }

    setIsSyncing(true);
    
    try {
      const pendingItems = pendingDiagnostics.filter(d => d.status === 'pending');
      
      for (const diagnostic of pendingItems) {
        try {
          // Simulate API call - replace with actual API
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Mark as synced
          const updated = pendingDiagnostics.map(d => 
            d.id === diagnostic.id ? { ...d, status: 'synced' as const } : d
          );
          savePendingDiagnostics(updated);
          
          console.log('[Offline] Synced diagnostic:', diagnostic.id);
        } catch (error) {
          console.error('[Offline] Failed to sync diagnostic:', diagnostic.id, error);
          
          // Mark as failed
          const updated = pendingDiagnostics.map(d => 
            d.id === diagnostic.id ? { ...d, status: 'failed' as const } : d
          );
          savePendingDiagnostics(updated);
        }
      }
      
      const syncedCount = pendingItems.length;
      if (syncedCount > 0) {
        toast.success(`✅ Synced ${syncedCount} diagnostics`);
      }
      
      // Remove old synced items (older than 24 hours)
      const cutoff = Date.now() - (24 * 60 * 60 * 1000);
      const cleaned = pendingDiagnostics.filter(d => 
        d.status === 'pending' || d.status === 'failed' || d.timestamp > cutoff
      );
      
      if (cleaned.length !== pendingDiagnostics.length) {
        savePendingDiagnostics(cleaned);
      }
      
    } catch (error) {
      console.error('[Offline] Sync failed:', error);
      toast.error('❌ Ошибка синхронизации');
    } finally {
      setIsSyncing(false);
    }
  };

  const clearPendingDiagnostics = () => {
    savePendingDiagnostics([]);
    toast.success('🗑️ Очередь очищена');
  };

  const retryFailedDiagnostics = async () => {
    const failedItems = pendingDiagnostics
      .filter(d => d.status === 'failed')
      .map(d => ({ ...d, status: 'pending' as const }));
    
    if (failedItems.length === 0) {
      toast.info('No failed diagnostics to retry');
      return;
    }
    
    const updated = pendingDiagnostics.map(d => 
      d.status === 'failed' ? { ...d, status: 'pending' as const } : d
    );
    
    savePendingDiagnostics(updated);
    
    if (isOnline) {
      await syncPendingDiagnostics();
    } else {
      toast.info(`${failedItems.length} diagnostics marked for retry`);
    }
  };

  // Don't render if no pending diagnostics
  if (pendingDiagnostics.length === 0) {
    return null;
  }

  const pendingCount = pendingDiagnostics.filter(d => d.status === 'pending').length;
  const failedCount = pendingDiagnostics.filter(d => d.status === 'failed').length;
  const syncedCount = pendingDiagnostics.filter(d => d.status === 'synced').length;

  return (
    <Card className="border border-white/20 rounded-2xl backdrop-blur-xl mb-6" style={{
      background: 'rgba(0, 0, 0, 0.4)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)'
    }}>
      <CardHeader className="pb-4">
        <div className="flex items-start gap-3">
          <div className={`p-2.5 rounded-xl flex-shrink-0 ${
            isOnline 
              ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
              : 'bg-gradient-to-r from-yellow-500 to-orange-500'
          }`}>
            {isOnline ? <Wifi className="h-5 w-5 text-white" /> : <WifiOff className="h-5 w-5 text-white" />}
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-xl font-bold text-white">
              {isOnline ? 'Data Sync' : 'Offline Mode'}
            </CardTitle>
            <CardDescription className="text-white/85 text-sm">
              {isOnline 
                ? 'Data will be synced to server'
                : 'Data saved locally until connection restored'
              }
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Status Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-yellow-500/20 rounded-lg border border-yellow-400/30">
            <div className="text-2xl font-bold text-yellow-300">{pendingCount}</div>
            <div className="text-xs text-yellow-200">Ожидают</div>
          </div>
          <div className="text-center p-3 bg-red-500/20 rounded-lg border border-red-400/30">
            <div className="text-2xl font-bold text-red-300">{failedCount}</div>
            <div className="text-xs text-red-200">Ошибки</div>
          </div>
          <div className="text-center p-3 bg-green-500/20 rounded-lg border border-green-400/30">
            <div className="text-2xl font-bold text-green-300">{syncedCount}</div>
            <div className="text-xs text-green-200">Отправлено</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {isOnline && pendingCount > 0 && (
            <Button
              onClick={syncPendingDiagnostics}
              disabled={isSyncing}
              size="sm"
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Sync Now
                </>
              )}
            </Button>
          )}
          
          {failedCount > 0 && (
            <Button
              onClick={retryFailedDiagnostics}
              size="sm"
              variant="outline"
              className="border-yellow-400/30 text-yellow-300 hover:bg-yellow-500/10"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Повторить ({failedCount})
            </Button>
          )}
          
          <Button
            onClick={clearPendingDiagnostics}
            size="sm"
            variant="outline"
            className="border-red-400/30 text-red-300 hover:bg-red-500/10"
          >
            Очистить все
          </Button>
        </div>

        {/* Offline Warning */}
        {!isOnline && (
          <Alert className="border-yellow-400/30 bg-yellow-500/10">
            <AlertTriangle className="h-4 w-4 text-yellow-400" />
            <AlertDescription className="text-yellow-200">
              You are in offline mode. Diagnostics are saved locally and will be sent when connection is restored.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

// Export function to add diagnostics from other components
export function addOfflineDiagnostic(diagnostic: Omit<OfflineDiagnostic, 'id' | 'timestamp' | 'status'>) {
  const event = new CustomEvent('addOfflineDiagnostic', { detail: diagnostic });
  window.dispatchEvent(event);
}