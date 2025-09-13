// Global type declarations
declare global {
  interface Window {
    __ENV__?: {
      GOOGLE_MAPS_API_KEY?: string;
      SUPABASE_URL?: string;
      SUPABASE_ANON_KEY?: string;
      GITHUB_TOKEN?: string;
      [key: string]: string | undefined;
    };
    google?: any;
    initMap?: () => void;
  }
  
  namespace NodeJS {
    interface ProcessEnv {
      VITE_GOOGLE_MAPS_API_KEY?: string;
      VITE_SUPABASE_URL?: string;
      VITE_SUPABASE_ANON_KEY?: string;
      GOOGLE_MAPS_API_KEY?: string;
      SUPABASE_URL?: string;
      SUPABASE_ANON_KEY?: string;
      SUPABASE_SERVICE_ROLE_KEY?: string;
      GITHUB_TOKEN?: string;
      NODE_ENV?: 'development' | 'production' | 'test';
    }
  }
}

// Extend Vite's ImportMeta interface
interface ImportMetaEnv {
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly DEV?: boolean;
  readonly PROD?: boolean;
  readonly MODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

export {};