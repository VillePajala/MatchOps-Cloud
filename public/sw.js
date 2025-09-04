// Disable service worker in development
const isDevEnvironment = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';

if (isDevEnvironment) {
  self.addEventListener('install', () => self.skipWaiting());
  self.addEventListener('activate', () => {
    self.clients.claim();
    // Unregister this service worker
    self.registration.unregister().then(() => {
      console.log('[SW] Service worker unregistered in development');
    });
  });
  self.addEventListener('fetch', () => { }); // Do nothing
} else {

  // Primary install and activate handlers are defined below with caching logic

  // Listen for messages from the client
  self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
      console.log('[SW] Received SKIP_WAITING message. Activating new service worker.');
      self.skipWaiting();
    }
  });

  // Cache configuration
  const _CACHE_NAME = 'matchops-coach-v1';
  const APP_SHELL_CACHE = 'app-shell-v1';
  const DATA_CACHE = 'data-cache-v1';

  // Files to cache for app shell
  const APP_SHELL_FILES = [
    '/',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png',
    '/offline.html' // We'll need to create this
  ];

  // Install event - cache app shell
  self.addEventListener('install', (event) => {
    console.log('[SW] Service worker installing...');
    event.waitUntil(
      caches.open(APP_SHELL_CACHE).then((cache) => {
        console.log('[SW] Caching app shell');
        // Cache only existing files, don't fail if some are missing
        return Promise.all(
          APP_SHELL_FILES.map(url =>
            cache.add(url).catch(err => {
              console.warn(`[SW] Failed to cache ${url}:`, err);
            })
          )
        );
      })
    );
  });

  // Activate event - clean up old caches
  self.addEventListener('activate', (event) => {
    console.log('[SW] Service worker activating...');
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== APP_SHELL_CACHE && cacheName !== DATA_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }).then(() => clients.claim())
    );
  });

  // Fetch handler with caching strategies
  self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip chrome-extension and non-http(s) requests
    if (!url.protocol.startsWith('http')) {
      return;
    }

    // API requests - Network first, cache fallback (GET only)
    if (url.pathname.startsWith('/api/') || url.hostname.includes('supabase')) {
      // Never attempt to cache non-GET requests (Cache API only supports GET)
      if (request.method !== 'GET') {
        event.respondWith(fetch(request));
        return;
      }
      event.respondWith(
        fetch(request)
          .then((response) => {
            // Clone the response before caching
            if (response.status === 200) {
              const responseToCache = response.clone();
              caches.open(DATA_CACHE).then((cache) => {
                cache.put(request, responseToCache);
              });
            }
            return response;
          })
          .catch(async () => {
            // Try cache on network failure; ensure a Response is returned
            const cached = await caches.match(request);
            return (
              cached || new Response(JSON.stringify({ error: 'offline' }), { status: 503, headers: { 'Content-Type': 'application/json' } })
            );
          })
      );
      return;
    }

    // App shell - Cache first, network fallback
    if (APP_SHELL_FILES.includes(url.pathname) || url.pathname.match(/^\/(js|css|fonts)\//)) {
      event.respondWith(
        caches.match(request).then((response) => {
          return response || fetch(request).then((fetchResponse) => {
            return caches.open(APP_SHELL_CACHE).then((cache) => {
              if (request.method === 'GET' && fetchResponse.status === 200) {
                cache.put(request, fetchResponse.clone());
              }
              return fetchResponse;
            });
          });
        })
      );
      return;
    }

    // Default - Network first for everything else
    event.respondWith(
      fetch(request).catch(async () => {
        // Return cached version or offline page; always return a Response
        const cached = await caches.match(request);
        if (cached) return cached;
        if (request.mode === 'navigate') {
          const offline = await caches.match('/offline.html');
          if (offline) return offline;
        }
        return new Response('', { status: 504 });
      })
    );
  });

} // End of production service worker code
// Build Timestamp: 2025-09-04T07:54:06.433Z