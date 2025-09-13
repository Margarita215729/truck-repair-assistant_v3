import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Simple environment initialization
try {
  // Initialize safe environment variables
  import('./lib/safe-env');
} catch (error) {
  console.warn('Failed to initialize environment variables:', error);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)