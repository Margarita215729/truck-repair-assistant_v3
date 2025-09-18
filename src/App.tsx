import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { DiagnosticAnalysis } from './components/DiagnosticAnalysis';
import { SmartReports } from './components/SmartReports';
import { ServiceLocations } from './components/ServiceLocations';
import { PWAInstaller } from './components/PWAInstaller';
import { PWAShortcuts } from './components/PWAShortcuts';
import { AuthProvider } from './components/AuthProvider';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Toaster } from './components/ui/sonner';

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

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'analysis':
        return <DiagnosticAnalysis />;
      case 'reports':
        return <SmartReports />;
      case 'locations':
        return <ServiceLocations />;
      default:
        return <DiagnosticAnalysis />;
    }
  };

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      {/* PWA Components */}
      <PWAShortcuts setActiveTab={setActiveTab} />
      <PWAInstaller />
      
      {/* Animated Background */}
      <div className="fixed inset-0 -z-10">
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
          setActiveTab={setActiveTab}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
        />
        <main className="flex-1 w-full max-w-full">
          {renderActiveTab()}
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
