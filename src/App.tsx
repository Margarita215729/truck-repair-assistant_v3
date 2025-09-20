import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { Header } from './components/Header';
import { PWAInstaller } from './components/PWAInstaller';
import { PWAShortcuts } from './components/PWAShortcuts';
import { AuthProvider } from './components/AuthProvider';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Toaster } from './components/ui/sonner';

// Lazy load heavy components to reduce initial bundle size
const DiagnosticAnalysis = lazy(() => import('./components/DiagnosticAnalysis').then(module => ({ default: module.DiagnosticAnalysis })));
const SmartReports = lazy(() => import('./components/SmartReports').then(module => ({ default: module.SmartReports })));
const ServiceLocations = lazy(() => import('./components/ServiceLocations').then(module => ({ default: module.ServiceLocations })));

// Loading component for lazy loaded components
const ComponentLoader = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
  </div>
);

function AppContent() {
  const [activeTab, setActiveTab] = useState('analysis');
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Memoize tab setters to prevent unnecessary re-renders
  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

  const handleDarkModeToggle = useCallback((dark: boolean) => {
    setDarkMode(dark);
  }, []);

  // Memoize the rendered component to avoid re-mounting on prop changes
  const renderActiveTab = useMemo(() => {
    const ComponentWrapper = ({ children }: { children: React.ReactNode }) => (
      <Suspense fallback={<ComponentLoader />}>
        {children}
      </Suspense>
    );

    switch (activeTab) {
      case 'analysis':
        return (
          <ComponentWrapper>
            <DiagnosticAnalysis />
          </ComponentWrapper>
        );
      case 'reports':
        return (
          <ComponentWrapper>
            <SmartReports />
          </ComponentWrapper>
        );
      case 'locations':
        return (
          <ComponentWrapper>
            <ServiceLocations />
          </ComponentWrapper>
        );
      default:
        return (
          <ComponentWrapper>
            <DiagnosticAnalysis />
          </ComponentWrapper>
        );
    }
  }, [activeTab]);

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      {/* Skip link for accessibility */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-white text-black px-4 py-2 rounded z-50"
      >
        Skip to main content
      </a>
      
      {/* PWA Components */}
      <PWAShortcuts setActiveTab={handleTabChange} />
      <PWAInstaller />
      
      {/* Animated Background */}
      <div className="fixed inset-0 -z-10" role="presentation" aria-hidden="true">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 dark:from-black dark:via-slate-900 dark:to-black" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(139,69,19,0.1),transparent_50%)]" />
        <div className="absolute top-0 left-1/4 w-48 h-48 sm:w-96 sm:h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-48 h-48 sm:w-96 sm:h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 w-32 h-32 sm:w-64 sm:h-64 bg-amber-500/5 rounded-full blur-2xl animate-bounce" style={{ animationDuration: '3s' }} />
      </div>
      
      {/* Main Content */}
      <div className="relative min-h-screen flex flex-col">
        <Header 
          activeTab={activeTab}
          setActiveTab={handleTabChange}
          darkMode={darkMode}
          setDarkMode={handleDarkModeToggle}
        />
        <main id="main-content" className="flex-1 w-full max-w-full" role="main">
          {renderActiveTab}
        </main>
      </div>
      <Toaster />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}
