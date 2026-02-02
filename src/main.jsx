import React from 'react';
import './App.css';
import ReactDOM from 'react-dom/client';
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import { initializeWebVitals, reportNavigationMetrics } from './utils/webVitalsUtil.js';

console.log('Mounting React app...');

// Initialize Web Vitals monitoring
initializeWebVitals();

// Report navigation metrics when page fully loads
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    setTimeout(() => reportNavigationMetrics(), 0);
  });
}

// Register Service Worker for offline support
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('Service Worker registered:', registration);
      })
      .catch((error) => {
        console.warn('Service Worker registration failed:', error);
      });
  });
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('React error caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', fontFamily: 'Arial' }}>
          <h1>Error in App</h1>
          <pre style={{ color: 'red', overflow: 'auto' }}>{this.state.error?.toString()}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}


ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);

console.log('React app mounted');
