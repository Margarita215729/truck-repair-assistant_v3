// Minimal App.tsx for testing deployment issues
import { useState } from 'react';

function App() {
  const [message] = useState('AI-Powered Truck Diagnostic System v2');

  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'Arial, sans-serif',
      minHeight: '100vh',
      backgroundColor: '#f5f5f5'
    }}>
      <header style={{ 
        backgroundColor: '#2563eb', 
        color: 'white', 
        padding: '20px', 
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h1>🚛 {message}</h1>
        <p>Status: Running successfully!</p>
      </header>
      
      <main style={{ 
        backgroundColor: 'white', 
        padding: '20px', 
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h2>✅ Deployment Test Successful</h2>
        <p>This minimal version proves that:</p>
        <ul>
          <li>✅ React is working</li>
          <li>✅ TypeScript compilation is successful</li>
          <li>✅ Vite bundling is working</li>
          <li>✅ The app can render to the DOM</li>
        </ul>
        
        <div style={{ 
          marginTop: '20px', 
          padding: '15px', 
          backgroundColor: '#e6f3ff', 
          borderRadius: '4px' 
        }}>
          <h3>🔧 Next Steps</h3>
          <p>If you see this page instead of a white screen, the deployment infrastructure is working.</p>
          <p>The white screen issue is likely caused by a runtime error in one of the complex components.</p>
        </div>
        
        <div style={{ 
          marginTop: '20px', 
          padding: '15px', 
          backgroundColor: '#f0f9ff', 
          borderRadius: '4px' 
        }}>
          <h3>🧪 Component Loading Test</h3>
          <ComponentLoadTest />
        </div>
      </main>
    </div>
  );
}

function ComponentLoadTest() {
  const [testResults, setTestResults] = useState<string[]>([]);
  
  const testComponent = async (name: string, importFn: () => Promise<any>) => {
    try {
      await importFn();
      setTestResults(prev => [...prev, `✅ ${name} - OK`]);
    } catch (error) {
      setTestResults(prev => [...prev, `❌ ${name} - Error: ${error.message}`]);
    }
  };

  const runTests = async () => {
    setTestResults(['🔍 Testing component imports...']);
    
    // Test critical components one by one
    await testComponent('Header', () => import('./components/Header'));
    await testComponent('ErrorBoundary', () => import('./components/ErrorBoundary'));
    await testComponent('AuthProvider', () => import('./components/AuthProvider'));
    await testComponent('DiagnosticAnalysis', () => import('./components/DiagnosticAnalysis'));
    await testComponent('SmartReports', () => import('./components/SmartReports'));
    await testComponent('ServiceLocations', () => import('./components/ServiceLocations'));
    
    setTestResults(prev => [...prev, '🏁 Component testing completed']);
  };

  return (
    <div>
      <button 
        onClick={runTests}
        style={{
          backgroundColor: '#2563eb',
          color: 'white',
          padding: '10px 20px',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Test Component Loading
      </button>
      
      <div style={{ marginTop: '10px' }}>
        {testResults.map((result, index) => (
          <div key={index} style={{ margin: '5px 0', fontFamily: 'monospace' }}>
            {result}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
