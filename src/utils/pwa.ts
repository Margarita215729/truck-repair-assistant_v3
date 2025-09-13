// PWA Utilities

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

export interface PWAInstallState {
  isInstallable: boolean;
  isInstalled: boolean;
  isStandalone: boolean;
  deferredPrompt: BeforeInstallPromptEvent | null;
}

// Check if app is running in standalone mode
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  
  // iOS Safari
  if ((window.navigator as any).standalone === true) {
    return true;
  }
  
  // Android Chrome
  if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }
  
  // Check URL params (for debugging)
  if (window.location.search.includes('standalone=true')) {
    return true;
  }
  
  return false;
}

// Check if device supports PWA installation
export function isPWAInstallable(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check for Service Worker support
  if (!('serviceWorker' in navigator)) {
    return false;
  }
  
  // Check for beforeinstallprompt support
  if ('onbeforeinstallprompt' in window) {
    return true;
  }
  
  // iOS Safari - check for PWA manifest support
  if (isIOSDevice() && 'share' in navigator) {
    return true;
  }
  
  return false;
}

// Check if device is iOS
export function isIOSDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

// Check if device is Android
export function isAndroidDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  return /Android/.test(navigator.userAgent);
}

// Get device type for analytics
export function getDeviceType(): 'ios' | 'android' | 'desktop' | 'unknown' {
  if (isIOSDevice()) return 'ios';
  if (isAndroidDevice()) return 'android';
  if (typeof window !== 'undefined' && window.innerWidth > 768) return 'desktop';
  return 'unknown';
}

// Request notification permission
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('[PWA] Notifications not supported');
    return 'denied';
  }
  
  if (Notification.permission === 'granted') {
    return 'granted';
  }
  
  if (Notification.permission === 'denied') {
    return 'denied';
  }
  
  try {
    const permission = await Notification.requestPermission();
    console.log('[PWA] Notification permission:', permission);
    return permission;
  } catch (error) {
    console.error('[PWA] Error requesting notification permission:', error);
    return 'denied';
  }
}

// Show local notification
export function showNotification(title: string, options?: NotificationOptions): Notification | null {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    console.warn('[PWA] Cannot show notification - no permission');
    return null;
  }
  
  const defaultOptions: NotificationOptions = {
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    vibrate: [200, 100, 200],
    requireInteraction: false,
    silent: false,
    ...options
  };
  
  try {
    return new Notification(title, defaultOptions);
  } catch (error) {
    console.error('[PWA] Error showing notification:', error);
    return null;
  }
}

// Register for push notifications
export async function subscribeToPushNotifications(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('[PWA] Push notifications not supported');
    return null;
  }
  
  try {
    const registration = await navigator.serviceWorker.ready;
    
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        'BEl62iUYgUivxIkv69yViEuiBIa40j13SUJhyDpU_bvpn7q0lRwY-Xhq7-T9v5J_L5k1lKyZ-e7pDw-Kk4t5KUU' // Replace with your VAPID public key
      )
    });
    
    console.log('[PWA] Push subscription created:', subscription);
    return subscription;
  } catch (error) {
    console.error('[PWA] Error subscribing to push notifications:', error);
    return null;
  }
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Cache management
export function clearPWACache(): Promise<void> {
  if (!('caches' in window)) {
    return Promise.resolve();
  }
  
  return caches.keys().then(cacheNames => {
    const deletePromises = cacheNames
      .filter(cacheName => cacheName.startsWith('truck-repair-'))
      .map(cacheName => caches.delete(cacheName));
    
    return Promise.all(deletePromises);
  }).then(() => {
    console.log('[PWA] Cache cleared');
  });
}

// Get app version from cache or manifest
export async function getAppVersion(): Promise<string> {
  try {
    const response = await fetch('/manifest.json');
    const manifest = await response.json();
    return manifest.version || '1.0.0';
  } catch (error) {
    console.error('[PWA] Error getting app version:', error);
    return '1.0.0';
  }
}

// Analytics helper for PWA events
export function trackPWAEvent(eventName: string, properties?: Record<string, any>): void {
  // Send analytics event
  console.log('[PWA Analytics]', eventName, properties);
  
  // You can integrate with your analytics service here
  // Example: gtag('event', eventName, properties);
}

// Handle app update
export function handleAppUpdate(): void {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[PWA] App updated, reloading...');
      window.location.reload();
    });
  }
}

// Preload critical resources
export function preloadCriticalResources(): void {
  const criticalResources = [
    '/',
    '/manifest.json',
    '/truck-icon.svg'
  ];
  
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(registration => {
      registration.active?.postMessage({
        type: 'PRELOAD_RESOURCES',
        resources: criticalResources
      });
    });
  }
}

// Handle offline/online status
export function handleNetworkStatus(onOnline?: () => void, onOffline?: () => void): () => void {
  const handleOnline = () => {
    console.log('[PWA] Network: online');
    onOnline?.();
  };
  
  const handleOffline = () => {
    console.log('[PWA] Network: offline');
    onOffline?.();
  };
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

// Share API helper
export async function shareContent(shareData: ShareData): Promise<boolean> {
  if (!('share' in navigator)) {
    console.warn('[PWA] Web Share API not supported');
    return false;
  }
  
  try {
    await navigator.share(shareData);
    console.log('[PWA] Content shared successfully');
    return true;
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      console.error('[PWA] Error sharing content:', error);
    }
    return false;
  }
}