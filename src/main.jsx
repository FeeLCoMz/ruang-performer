import React from 'react';
// Gaya di-split per domain — urutan import harus dipertahankan agar spesifisitas
// CSS sama seperti saat masih satu file App.css.
import './styles/theme.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/legacy-misc.css';
import './styles/responsive-anim.css';
import './styles/setlist-songs.css';
import './styles/song-editor.css';
import './styles/tools.css';
import './styles/modules.css';
import './styles/chord-display.css';
import './styles/zoom-skeleton.css';
import './styles/playback.css';
import './styles/media-panel.css';
import './styles/lyrics-page.css';
import './styles/lyrics-capsules.css';
import './styles/lyrics-editor.css';
import './modules/midi/virtual-piano.css';
import './styles/mobile-polish.css';
import './styles/song-add-edit.css';
import './styles/media-panel-smp.css';
import './styles/editor-menu.css';
import './styles/setlist-mobile.css';
import './styles/lyrics-view-modes.css';
import './styles/landing.css';
import ReactDOM from 'react-dom/client';
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import { initializeWebVitals, reportNavigationMetrics } from './utils/webVitalsUtil.js';
import * as authUtils from './utils/auth.js';

const originalFetch = typeof window !== 'undefined' ? window.fetch.bind(window) : null;

function shouldRedirectOnUnauthorized(url, options = {}) {
  const headers = options.headers || {};
  return Boolean(headers.Authorization || headers.authorization);
}

async function fetchWithAuth(input, init) {
  const response = originalFetch ? await originalFetch(input, init) : await fetch(input, init);
  if (response.status === 401 && shouldRedirectOnUnauthorized(input, init)) {
    authUtils.logout();
    if (typeof window !== 'undefined') {
      window.location.replace('/login');
    }
  }
  return response;
}

if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
  window.fetch = fetchWithAuth;
}

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
      .catch((error) => {
        console.warn('Registrasi Service Worker gagal:', error);
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
    console.error('Terjadi error pada React:', error, errorInfo);
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
