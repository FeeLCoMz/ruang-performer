/**
 * Ruang Performer Service Worker
 * Advanced caching strategy for different resource types
 */

const CACHE_NAME = 'ruangperformer-v1';
const STATIC_CACHE = 'ruangperformer-static-v1';
const DYNAMIC_CACHE = 'ruangperformer-dynamic-v1';
const API_CACHE = 'ruangperformer-api-v1';

const STATIC_URLS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/manifest.json',
  '/sw.js'
];

// Install event - cache essential files with multiple strategies
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      // Static assets (cache-first)
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('[ServiceWorker] Caching static assets');
        return cache.addAll(STATIC_URLS);
      }),
      // Main cache
      caches.open(CACHE_NAME).then((cache) => {
        console.log('[ServiceWorker] Caching app shell');
        return cache.addAll(STATIC_URLS);
      })
    ]).catch((err) => {
      console.error('[ServiceWorker] Cache installation failed:', err);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (![CACHE_NAME, STATIC_CACHE, DYNAMIC_CACHE, API_CACHE].includes(cacheName)) {
            console.log('[ServiceWorker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - intelligent caching strategy based on resource type
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http(s) schemes
  if (!event.request.url.startsWith('http://') && !event.request.url.startsWith('https://')) {
    return;
  }

  const { pathname } = new URL(event.request.url);

  // API calls - Network first with API cache fallback
  if (pathname.includes('/api/')) {
    event.respondWith(networkFirstWithCache(event.request, API_CACHE));
    return;
  }

  // Static assets (CSS, JS, fonts, images) - Cache first
  if (pathname.match(/\.(js|css|woff|woff2|ttf|eot|svg)$/i)) {
    event.respondWith(cacheFirstWithNetwork(event.request, STATIC_CACHE));
    return;
  }

  // HTML pages - Network first for freshness
  if (pathname.endsWith('.html') || pathname === '/') {
    event.respondWith(networkFirstWithCache(event.request, CACHE_NAME));
    return;
  }

  // External resources (googleapis, youtube) - Network only
  if (event.request.url.includes('googleapis') || event.request.url.includes('youtube')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(
          JSON.stringify({ offline: true, message: 'Resource tidak tersedia offline' }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  // Default - Network first with dynamic cache
  event.respondWith(networkFirstWithCache(event.request, DYNAMIC_CACHE));
});

/**
 * Cache-first strategy
 * Return cached resource if available, otherwise fetch from network
 */
function cacheFirstWithNetwork(request, cacheName) {
  return caches.match(request).then((response) => {
    if (response) {
      return response;
    }

    return fetch(request).then((response) => {
      if (!response || response.status !== 200) {
        return response;
      }

      // Cache the fetched response
      const responseToCache = response.clone();
      caches.open(cacheName).then((cache) => {
        cache.put(request, responseToCache).catch((err) => {
          console.warn('[ServiceWorker] Cache put failed:', err);
        });
      });

      return response;
    });
  }).catch(() => {
    return caches.match('/') || new Response('Offline');
  });
}

/**
 * Network-first strategy
 * Fetch from network first, fallback to cache
 */
function networkFirstWithCache(request, cacheName) {
  return fetch(request)
    .then((response) => {
      if (!response || response.status !== 200) {
        return response;
      }

      // Cache successful responses
      const responseToCache = response.clone();
      caches.open(cacheName).then((cache) => {
        cache.put(request, responseToCache).catch((err) => {
          console.warn('[ServiceWorker] Cache put failed:', err);
        });
      });

      return response;
    })
    .catch(() => {
      // Network failed, try cache
      return caches.match(request).then((response) => {
        if (response) {
          return response;
        }
        // Return offline page
        return caches.match('/') || new Response('Offline');
      });
    });
}

// Handle messages from client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((cacheNames) => {
      Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName))
      );
    });
  }
});
