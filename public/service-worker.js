/* Service Worker for RoNz Chord
  Handles offline caching and data sync
*/

const CACHE_NAME = 'ronz-chord-v1';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/src/main.jsx',
  '/src/App.jsx',
  '/src/App.css',
  '/src/index.css',
  '/src/print.css'
];

// Install event - cache essential assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Caching app shell');
      return cache.addAll(URLS_TO_CACHE).catch(err => {
        console.warn('[SW] Cache addAll error:', err);
        // Continue even if some resources fail to cache
        return Promise.resolve();
      });
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip API calls - let them go through network
  // but cache successful API responses for offline use
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Cache successful API responses
          if (response.ok && request.method === 'GET') {
            const cache = caches.open(CACHE_NAME);
            cache.then(c => c.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => {
          // Return cached API response if offline
          return caches.match(request).then(cached => {
            return cached || new Response(
              JSON.stringify({ error: 'Offline - cached response' }),
              { 
                status: 503, 
                statusText: 'Service Unavailable',
                headers: { 'Content-Type': 'application/json' }
              }
            );
          });
        })
    );
    return;
  }

  // For app resources: cache first, fallback to network
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) {
        return cached;
      }

      return fetch(request)
        .then(response => {
          // Cache successful responses
          if (response.ok) {
            const cache = caches.open(CACHE_NAME);
            cache.then(c => c.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => {
          // Offline - try to serve a meaningful response
          if (request.destination === 'document') {
            return caches.match('/index.html');
          }
          return new Response('Offline', { status: 503 });
        });
    })
  );
});

// Handle messages from clients
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME).then(() => {
      console.log('[SW] Cache cleared');
      event.ports[0].postMessage({ cleared: true });
    });
  }
});

// Handle background sync when coming online
self.addEventListener('sync', event => {
  if (event.tag === 'sync-songs') {
    event.waitUntil(syncSongs());
  }
  if (event.tag === 'sync-setlists') {
    event.waitUntil(syncSetlists());
  }
});

// Helper functions for syncing
async function syncSongs() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match('/api/songs');
    if (response) {
      const data = await response.json();
      // Sync to server
      await fetch('/api/songs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    }
  } catch (err) {
    console.error('[SW] Sync songs error:', err);
  }
}

async function syncSetlists() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match('/api/setlists');
    if (response) {
      const data = await response.json();
      // Sync to server
      await fetch('/api/setlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    }
  } catch (err) {
    console.error('[SW] Sync setlists error:', err);
  }
}
