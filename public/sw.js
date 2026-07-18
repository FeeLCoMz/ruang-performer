/**
 * Ruang Performer Service Worker
 * Advanced caching strategy for different resource types
 */

const CACHE_NAME = 'ruangperformer-v2';
const STATIC_CACHE = 'ruangperformer-static-v2';
const DYNAMIC_CACHE = 'ruangperformer-dynamic-v2';
const API_CACHE = 'ruangperformer-api-v2';

const STATIC_URLS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/manifest.json',
  '/sw.js'
];

const INDEX_HTML_URL = '/index.html';

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

  // SPA navigation requests - always serve cached app shell when offline.
  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(event.request));
    return;
  }

  // API calls - Network first with API cache fallback
  if (pathname.includes('/api/')) {
    event.respondWith(networkFirstApi(event.request, API_CACHE));
    return;
  }

  // Static assets (CSS, JS, fonts, images) - stale while revalidate.
  if (event.request.destination.match(/^(script|style|font|image|worker)$/)) {
    event.respondWith(staleWhileRevalidate(event.request, STATIC_CACHE));
    return;
  }

  // HTML pages - Network first for freshness
  if (pathname.endsWith('.html') || pathname === '/' || pathname === INDEX_HTML_URL) {
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

function networkFirstNavigation(request) {
  return fetch(request)
    .then((response) => {
      if (response && response.status === 200) {
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache).catch((err) => {
            console.warn('[ServiceWorker] Navigation cache put failed:', err);
          });
        });
      }

      return response;
    })
    .catch(async () => {
      const cachedRoute = await caches.match(request);
      if (cachedRoute) {
        return cachedRoute;
      }

      const cachedIndex = await caches.match(INDEX_HTML_URL);
      if (cachedIndex) {
        return cachedIndex;
      }

      return caches.match('/') || new Response('Offline', { status: 503, statusText: 'Offline' });
    });
}

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
 * Stale-while-revalidate strategy
 * Return cache quickly and update in background
 */
function staleWhileRevalidate(request, cacheName) {
  return caches.match(request).then((cachedResponse) => {
    const fetchPromise = fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(cacheName).then((cache) => {
            cache.put(request, responseToCache).catch((err) => {
              console.warn('[ServiceWorker] Cache put failed:', err);
            });
          });
        }

        return networkResponse;
      })
      .catch(() => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return new Response('Offline', { status: 503, statusText: 'Offline' });
      });

    return cachedResponse || fetchPromise;
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

function networkFirstApi(request, cacheName) {
  return fetch(request)
    .then((response) => {
      if (response && response.status === 200) {
        const responseToCache = response.clone();
        caches.open(cacheName).then((cache) => {
          cache.put(request, responseToCache).catch((err) => {
            console.warn('[ServiceWorker] API cache put failed:', err);
          });
        });
      }

      return response;
    })
    .catch(() => {
      return caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return new Response(
          JSON.stringify({
            offline: true,
            message: 'Tidak ada koneksi internet. Data API tidak tersedia.',
          }),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          }
        );
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
