const CACHE_NAME = 'nova-finance-v2';

const STATIC_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/favicon.ico',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/apple-icon.png',
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Exclude chrome-extension scheme, API calls, and Next.js development internal files
  if (
    !url.protocol.startsWith('http') ||
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/_next/static/development') ||
    url.pathname.includes('webpack')
  ) {
    return;
  }

  // Bypass service worker for Next.js Server Component (RSC) and prefetch data requests to prevent stale cached data
  const isNextInternal = 
    url.pathname.startsWith('/_next/data') ||
    event.request.headers.has('RSC') ||
    event.request.headers.has('Next-Router-Prefetch') ||
    event.request.headers.has('Next-Router-State-Tree') ||
    event.request.headers.has('Next-Url');

  if (isNextInternal) {
    return;
  }

  // Bypass service worker for document navigation (HTML) to avoid serving stale HTML referencing deleted static chunks
  if (
    event.request.mode === 'navigate' ||
    (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html'))
  ) {
    return;
  }

  // Cache-First strategy for static files (images, CSS, JS, fonts)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch in background to update cache (stale-while-revalidate style)
        fetch(event.request)
          .then((response) => {
            if (response.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, response);
              });
            }
          })
          .catch(() => {/* Ignore background fetch errors */});
        return cachedResponse;
      }

      return fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200) {
            return response;
          }
          
          // Only cache same-origin basic or CORS response types
          const isSameOrigin = new URL(event.request.url).origin === self.location.origin;
          if (isSameOrigin && (response.type === 'basic' || response.type === 'cors')) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch((err) => {
          console.error('[Service Worker] Fetch failed for:', event.request.url, err);
          throw err;
        });
    })
  );
});
