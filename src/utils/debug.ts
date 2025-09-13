export const DEBUG = {
  log: (message: string, data?: any): void => {
    if (typeof console !== 'undefined') {
      console.log(`[TruckDiagnosis] ${message}`, data || '');
    }
  },
  
  error: (message: string, error?: any): void => {
    if (typeof console !== 'undefined') {
      console.error(`[TruckDiagnosis ERROR] ${message}`, error || '');
    }
  },
  
  warn: (message: string, data?: any): void => {
    if (typeof console !== 'undefined') {
      console.warn(`[TruckDiagnosis WARN] ${message}`, data || '');
    }
  },
  
  info: (message: string, data?: any): void => {
    if (typeof console !== 'undefined') {
      console.info(`[TruckDiagnosis INFO] ${message}`, data || '');
    }
  }
};

// Environment check utilities
export const ENV_CHECK = {
  hasGoogleMapsKey: (): boolean => {
    try {
      // Check window.__ENV__ for API key
      if (typeof window !== 'undefined' && (window as any).__ENV__ && (window as any).__ENV__.GOOGLE_MAPS_API_KEY) {
        const key = (window as any).__ENV__.GOOGLE_MAPS_API_KEY;
        return !!(key && key !== 'YOUR_API_KEY' && key.length > 20);
      }
      return false;
    } catch {
      return false;
    }
  },
  
  isGeolocationSupported: (): boolean => {
    return !!(typeof navigator !== 'undefined' && navigator.geolocation);
  },
  
  logEnvironmentInfo: (): void => {
    try {
      const hasGoogleMapsKey = ENV_CHECK.hasGoogleMapsKey();
      DEBUG.info('Environment Check:', {
        hasGoogleMapsKey,
        isGeolocationSupported: ENV_CHECK.isGeolocationSupported(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A',
        protocol: typeof window !== 'undefined' ? window.location.protocol : 'N/A',
        hostname: typeof window !== 'undefined' ? window.location.hostname : 'N/A',
        envKeys: typeof window !== 'undefined' && (window as any).__ENV__ ? Object.keys((window as any).__ENV__) : []
      });
    } catch (error) {
      DEBUG.error('Failed to log environment info:', error);
    }
  },

  // Safe initialization utility for components
  safeInit: (componentName: string, initFn: () => void): void => {
    try {
      DEBUG.info(`${componentName} component initializing`);
      ENV_CHECK.logEnvironmentInfo();
      initFn();
    } catch (error) {
      DEBUG.error(`${componentName} initialization failed:`, error);
    }
  }
};