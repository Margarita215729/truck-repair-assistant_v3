// Simple component test to catch runtime errors
import React from 'react';
import ReactDOM from 'react-dom/client';

// Test basic component rendering
function TestApp() {
  try {
    return (
      <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
        <h1>🧪 Component Test</h1>
        <p>If you see this, React is working!</p>
        
        <div style={{ border: '1px solid #ccc', padding: '10px', margin: '10px 0' }}>
          <h2>Basic Component Test</h2>
          <TestComponent />
        </div>
        
        <div style={{ border: '1px solid #ccc', padding: '10px', margin: '10px 0' }}>
          <h2>Hook Test</h2>
          <HookTest />
        </div>
      </div>
    );
  } catch (error) {
    return (
      <div style={{ color: 'red', padding: '20px' }}>
        <h1>❌ Error in TestApp</h1>
        <p>{error.toString()}</p>
      </div>
    );
  }
}

function TestComponent() {
  try {
    return (
      <div>
        <p>✅ Basic component rendering works</p>
      </div>
    );
  } catch (error) {
    return <p style={{ color: 'red' }}>❌ TestComponent error: {error.toString()}</p>;
  }
}

function HookTest() {
  try {
    const [count, setCount] = React.useState(0);
    
    return (
      <div>
        <p>✅ useState hook works: {count}</p>
        <button onClick={() => setCount(count + 1)}>
          Increment
        </button>
      </div>
    );
  } catch (error) {
    return <p style={{ color: 'red' }}>❌ HookTest error: {error.toString()}</p>;
  }
}

// Test the actual App component
async function testMainApp() {
  try {
    const { default: App } = await import('../src/App');
    return <App />;
  } catch (error) {
    return (
      <div style={{ color: 'red', padding: '20px' }}>
        <h2>❌ Error loading main App</h2>
        <p>{error.toString()}</p>
        <details>
          <summary>Error details</summary>
          <pre>{error.stack}</pre>
        </details>
      </div>
    );
  }
}

// Mount the test
if (typeof window !== 'undefined' && document.getElementById('root')) {
  const root = ReactDOM.createRoot(document.getElementById('root')!);
  
  // First test basic React functionality
  root.render(<TestApp />);
  
  // Then try to load the actual app after a delay
  setTimeout(async () => {
    try {
      const AppComponent = await testMainApp();
      root.render(
        <div>
          <div style={{ background: '#e6ffe6', padding: '10px', margin: '10px 0' }}>
            <h2>✅ Main App Test</h2>
            <p>Loading main application...</p>
          </div>
          {AppComponent}
        </div>
      );
    } catch (error) {
      root.render(
        <div>
          <TestApp />
          <div style={{ background: '#ffe6e6', padding: '10px', margin: '10px 0' }}>
            <h2>❌ Main App Failed</h2>
            <p>{error.toString()}</p>
          </div>
        </div>
      );
    }
  }, 2000);
}

export default TestApp;
