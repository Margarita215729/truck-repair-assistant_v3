import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

// Vite configuration for Vercel deployment
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    sourcemap: false,
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-tabs', '@radix-ui/react-select']
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    minify: 'esbuild',
    assetsDir: 'assets'
  },
  server: {
    port: 3000,
    host: true,
    logLevel: 'info',
    middlewareMode: false,
    open: false,
    cors: true,
    strictPort: false,
    fs: {
      allow: ['..']
    }
  },
  preview: {
    port: 4173,
    host: true,
    logLevel: 'info'
  },
  base: '/',
  publicDir: 'public',
  logLevel: 'info',
  define: {
    __VITE_BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  }
});