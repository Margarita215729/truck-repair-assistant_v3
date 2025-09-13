import { useEffect } from 'react';
import { toast } from 'sonner@2.0.3';

interface PWAShortcutsProps {
  setActiveTab: (tab: string) => void;
}

export function PWAShortcuts({ setActiveTab }: PWAShortcutsProps) {
  useEffect(() => {
    // Handle pending shortcuts from PWA launch
    const pendingShortcut = localStorage.getItem('pendingShortcut');
    
    if (pendingShortcut) {
      localStorage.removeItem('pendingShortcut');
      
      switch (pendingShortcut) {
        case 'diagnosis':
          setActiveTab('analysis');
          toast.info('🔧 Быстрая диагностика запущена');
          break;
          
        case 'locations':
          setActiveTab('locations');
          toast.info('📍 Поиск автосервисов');
          break;
          
        case 'tow':
          setActiveTab('analysis');
          // Scroll to tow trucks section after a delay
          setTimeout(() => {
            const towSection = document.querySelector('[value="tow-trucks"]');
            if (towSection) {
              (towSection as HTMLElement).click();
              toast.info('🚛 Вызов эвакуатора');
            }
          }, 1000);
          break;
          
        default:
          setActiveTab('analysis');
          break;
      }
    }
  }, [setActiveTab]);

  // Handle app state changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // App became visible again
        console.log('[PWA] App resumed');
        
        // Trigger cache cleanup
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'CLEANUP_CACHE'
          });
        }
      }
    };

    // Handle online/offline status
    const handleOnline = () => {
      toast.success('🌐 Соединение восстановлено');
    };

    const handleOffline = () => {
      toast.info('📱 Работаем в оффлайн режиме');
    };

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return null; // This component doesn't render anything
}