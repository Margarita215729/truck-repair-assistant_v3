import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.truckrepairassistant.mobile',
  appName: 'Truck Repair Assistant',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https',
    // Разрешить запросы к API
    allowNavigation: [
      'https://www.tra.tools',
      'https://truck-repair-assistantv3-main.vercel.app',
      'https://*.supabase.co',
      'https://*.googleapis.com',
      'https://models.github.ai',
      'https://router.project-osrm.org',
    ],
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: '#0b1012',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0b1012',
      overlaysWebView: false,
    },
  },
};

export default config;