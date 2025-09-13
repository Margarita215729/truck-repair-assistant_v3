import { useState, useEffect, Suspense } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';

// Safe component loader with error handling
function SafeComponentLoader({ children, fallback, name }: { 
  children: React.ReactNode; 
  fallback: React.ReactNode;
  name: string;
}) {
  return (
    <ErrorBoundary>
      <Suspense fallback={fallback}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState('analysis');
  const [darkMode, setDarkMode] = useState(false);
  const [loadedComponents, setLoadedComponents] = useState<Set<string>>(new Set());
  const [failedComponents, setFailedComponents] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Progressive component loading
  const loadComponent = async (componentName: string, importFn: () => Promise<any>) => {
    try {
      await importFn();
      setLoadedComponents(prev => new Set([...prev, componentName]));
      console.log(`✅ ${componentName} loaded successfully`);
    } catch (error) {
      setFailedComponents(prev => new Set([...prev, componentName]));
      console.error(`❌ ${componentName} failed to load:`, error);
    }
  };

  useEffect(() => {
    // Load components progressively
    const loadComponents = async () => {
      console.log('🔄 Starting progressive component loading...');
      
      // Load in order of importance/complexity
      await loadComponent('Header', () => import('./components/Header'));
      await loadComponent('AuthProvider', () => import('./components/AuthProvider'));
      await loadComponent('DiagnosticAnalysis', () => import('./components/DiagnosticAnalysis'));
      await loadComponent('SmartReports', () => import('./components/SmartReports'));
      await loadComponent('ServiceLocations', () => import('./components/ServiceLocations'));
      
      console.log('✅ Component loading completed');
    };
    
    loadComponents();
  }, []);

  return (
    <div className={`min-h-screen ${darkMode ? 'dark' : ''}`}>
      {/* Safe header */}
      <SafeComponentLoader 
        name="Header"
        fallback={
          <header className="bg-blue-600 text-white p-4">
            <h1>🚛 AI-Powered Truck Diagnostic System v2</h1>
            <p>Loading...</p>
          </header>
        }
      >
        {loadedComponents.has('Header') ? (
          <HeaderComponent darkMode={darkMode} setDarkMode={setDarkMode} />
        ) : (
          <header className="bg-blue-600 text-white p-4">
            <h1>🚛 AI-Powered Truck Diagnostic System v2</h1>
            <p>Loading header...</p>
          </header>
        )}
      </SafeComponentLoader>

      {/* Navigation */}
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {[
              { id: 'analysis', label: '🔍 Analysis', icon: '🔍' },
              { id: 'reports', label: '📊 Reports', icon: '📊' },
              { id: 'locations', label: '📍 Locations', icon: '📍' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main content with progressive loading */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* Component loading status */}
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">🧪 Component Loading Status</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {['Header', 'AuthProvider', 'DiagnosticAnalysis', 'SmartReports', 'ServiceLocations'].map(comp => (
                <div key={comp} className="flex items-center space-x-2">
                  <span className={`w-3 h-3 rounded-full ${
                    loadedComponents.has(comp) ? 'bg-green-500' : 
                    failedComponents.has(comp) ? 'bg-red-500' : 'bg-yellow-500'
                  }`}></span>
                  <span className="text-sm">{comp}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Content based on active tab */}
          <SafeComponentLoader 
            name="MainContent"
            fallback={<div className="text-center py-8">Loading content...</div>}
          >
            {activeTab === 'analysis' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold">🔍 Diagnostic Analysis</h2>
                {loadedComponents.has('DiagnosticAnalysis') ? (
                  <DiagnosticAnalysisComponent />
                ) : failedComponents.has('DiagnosticAnalysis') ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h3 className="text-red-800 font-semibold">❌ DiagnosticAnalysis Component Failed</h3>
                    <p className="text-red-600">This component has runtime errors. Check console for details.</p>
                  </div>
                ) : (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="text-blue-800 font-semibold">⏳ Loading DiagnosticAnalysis...</h3>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'reports' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold">📊 Smart Reports</h2>
                {loadedComponents.has('SmartReports') ? (
                  <SmartReportsComponent />
                ) : failedComponents.has('SmartReports') ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h3 className="text-red-800 font-semibold">❌ SmartReports Component Failed</h3>
                    <p className="text-red-600">This component has runtime errors. Check console for details.</p>
                  </div>
                ) : (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="text-blue-800 font-semibold">⏳ Loading SmartReports...</h3>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'locations' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold">📍 Service Locations</h2>
                {loadedComponents.has('ServiceLocations') ? (
                  <ServiceLocationsComponent />
                ) : failedComponents.has('ServiceLocations') ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h3 className="text-red-800 font-semibold">❌ ServiceLocations Component Failed</h3>
                    <p className="text-red-600">This component has runtime errors. Check console for details.</p>
                  </div>
                ) : (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="text-blue-800 font-semibold">⏳ Loading ServiceLocations...</h3>
                  </div>
                )}
              </div>
            )}
          </SafeComponentLoader>
        </div>
      </main>

      {/* Debug info */}
      <footer className="mt-8 p-4 bg-gray-100 dark:bg-gray-800 text-sm">
        <div className="max-w-7xl mx-auto">
          <h4 className="font-semibold mb-2">🐛 Debug Info:</h4>
          <p>✅ Loaded: {Array.from(loadedComponents).join(', ') || 'None'}</p>
          <p>❌ Failed: {Array.from(failedComponents).join(', ') || 'None'}</p>
          <p>🔄 Active Tab: {activeTab}</p>
        </div>
      </footer>
    </div>
  );
}

// Safe component wrappers
function HeaderComponent({ darkMode, setDarkMode }: { darkMode: boolean; setDarkMode: (value: boolean) => void }) {
  try {
    const { Header } = require('./components/Header');
    return <Header darkMode={darkMode} setDarkMode={setDarkMode} />;
  } catch (error) {
    console.error('Header component error:', error);
    return (
      <header className="bg-blue-600 text-white p-4">
        <h1>🚛 AI-Powered Truck Diagnostic System v2</h1>
        <p>❌ Header component failed to load</p>
      </header>
    );
  }
}

function DiagnosticAnalysisComponent() {
  try {
    const { DiagnosticAnalysis } = require('./components/DiagnosticAnalysis');
    return <DiagnosticAnalysis />;
  } catch (error) {
    console.error('DiagnosticAnalysis component error:', error);
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="text-red-800 font-semibold">❌ DiagnosticAnalysis Error</h3>
        <p className="text-red-600">{error.toString()}</p>
      </div>
    );
  }
}

function SmartReportsComponent() {
  try {
    const { SmartReports } = require('./components/SmartReports');
    return <SmartReports />;
  } catch (error) {
    console.error('SmartReports component error:', error);
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="text-red-800 font-semibold">❌ SmartReports Error</h3>
        <p className="text-red-600">{error.toString()}</p>
      </div>
    );
  }
}

function ServiceLocationsComponent() {
  try {
    const { ServiceLocations } = require('./components/ServiceLocations');
    return <ServiceLocations />;
  } catch (error) {
    console.error('ServiceLocations component error:', error);
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="text-red-800 font-semibold">❌ ServiceLocations Error</h3>
        <p className="text-red-600">{error.toString()}</p>
      </div>
    );
  }
}

export default App;