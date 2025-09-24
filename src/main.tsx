import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'

console.log('🚀 main.tsx loaded');
console.log('📁 Current directory:', import.meta.url);
console.log('🌐 Environment:', import.meta.env.MODE);

try {
  const root = document.getElementById('root');
  console.log('🎯 Root element found:', !!root);

  if (!root) {
    throw new Error('Root element not found');
  }

  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )

  console.log('✅ React app rendered successfully');
} catch (error) {
  console.error('❌ Failed to render React app:', error);
}