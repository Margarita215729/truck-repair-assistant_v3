const CACHE_NAME = 'truck-repair-ai-v1.0.0';
const STATIC_CACHE_NAME = 'truck-repair-static-v1.0.0';
const DYNAMIC_CACHE_NAME = 'truck-repair-dynamic-v1.0.0';

// Critical resources that should be cached immediately
const STATIC_RESOURCES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/truck-icon.svg',
  // Add other static assets as needed
];

// Resources that can be cached dynamically
const CACHEABLE_URLS = [
  // API endpoints
  /^https:\/\/.*\.supabase\.co/,
  // External resources
  /^https:\/\/fonts\.googleapis\.com/,
  /^https:\/\/fonts\.gstatic\.com/,
  /^https:\/\/api\.unsplash\.com/,
  // Local resources
  /^\/(?!api)/
];

// Install event - cache static resources
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static resources');
        return cache.addAll(STATIC_RESOURCES);
      })
      .then(() => {
        console.log('[SW] Static resources cached');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Error caching static resources:', error);
      })
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        const deletePromises = cacheNames
          .filter((cacheName) => {
            return cacheName !== STATIC_CACHE_NAME && 
                   cacheName !== DYNAMIC_CACHE_NAME &&
                   cacheName.startsWith('truck-repair-');
          })
          .map((cacheName) => {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          });
        
        return Promise.all(deletePromises);
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - handle network requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and chrome-extension requests
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return;
  }

  // Handle navigation requests (HTML pages)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone response before caching
          const responseClone = response.clone();
          
          if (response.ok) {
            caches.open(DYNAMIC_CACHE_NAME)
              .then((cache) => cache.put(request, responseClone))
              .catch((error) => console.error('[SW] Error caching navigation:', error));
          }
          
          return response;
        })
        .catch(() => {
          // Return cached version if available, otherwise return offline page
          return caches.match('/index.html')
            .then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              
              // Return a basic offline page
              return new Response(`
                <!DOCTYPE html>
                <html>
                <head>
                  <title>Truck Repair AI - Offline</title>
                  <meta name="viewport" content="width=device-width, initial-scale=1">
                  <style>
                    body { 
                      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                      margin: 0; padding: 20px; text-align: center;
                      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
                      color: white; min-height: 100vh;
                      display: flex; flex-direction: column; justify-content: center;
                    }
                    .logo { font-size: 48px; margin-bottom: 20px; }
                    .message { font-size: 18px; margin-bottom: 30px; opacity: 0.9; }
                    .btn { 
                      background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
                      color: white; padding: 12px 24px; border: none;
                      border-radius: 8px; font-size: 16px; cursor: pointer;
                      text-decoration: none; display: inline-block;
                    }
                  </style>
                </head>
                <body>
                  <div class="logo">🚛</div>
                  <h1>Truck Repair AI</h1>
                  <p class="message">Вы находитесь в оффлайн режиме.<br>Проверьте подключение к интернету.</p>
                  <button class="btn" onclick="window.location.reload()">Попробовать снова</button>
                </body>
                </html>
              `, {
                headers: { 'Content-Type': 'text/html' }
              });
            });
        })
    );
    return;
  }

  // Handle other requests with cache-first strategy for static resources
  const shouldCache = CACHEABLE_URLS.some(pattern => pattern.test(request.url));
  
  if (shouldCache) {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            // Return cached version and update cache in background
            fetch(request)
              .then((response) => {
                if (response.ok) {
                  const responseClone = response.clone();
                  caches.open(DYNAMIC_CACHE_NAME)
                    .then((cache) => cache.put(request, responseClone))
                    .catch((error) => console.error('[SW] Background cache update failed:', error));
                }
              })
              .catch(() => {
                // Silently fail background update
              });
            
            return cachedResponse;
          }
          
          // Not in cache, fetch from network
          return fetch(request)
            .then((response) => {
              if (response.ok) {
                const responseClone = response.clone();
                caches.open(DYNAMIC_CACHE_NAME)
                  .then((cache) => cache.put(request, responseClone))
                  .catch((error) => console.error('[SW] Error caching resource:', error));
              }
              return response;
            })
            .catch((error) => {
              console.error('[SW] Fetch failed:', error);
              
              // Return fallback for images
              if (request.destination === 'image') {
                return new Response(`
                  <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
                    <rect width="200" height="200" fill="#e5e7eb"/>
                    <text x="100" y="100" text-anchor="middle" fill="#6b7280" font-family="Arial" font-size="14">Image unavailable</text>
                  </svg>
                `, { headers: { 'Content-Type': 'image/svg+xml' } });
              }
              
              throw error;
            });
        })
    );
  }
});

// Background sync for diagnostics
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'diagnostic-sync') {
    event.waitUntil(
      syncDiagnostics()
    );
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);
  
  const options = {
    body: event.data ? event.data.text() : 'Новое уведомление от Truck Repair AI',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    vibrate: [200, 100, 200],
    data: {
      timestamp: Date.now(),
      url: '/'
    },
    actions: [
      {
        action: 'open',
        title: 'Открыть'
      },
      {
        action: 'close',
        title: 'Закрыть'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Truck Repair AI', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click:', event);
  
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow(event.notification.data?.url || '/')
    );
  }
});

// Helper function to sync diagnostics
async function syncDiagnostics() {
  try {
    // Get pending diagnostics from IndexedDB or localStorage
    const pendingDiagnostics = await getPendingDiagnostics();
    
    for (const diagnostic of pendingDiagnostics) {
      try {
        // Attempt to sync with server
        await syncDiagnosticToServer(diagnostic);
        
        // Remove from pending if successful
        await removePendingDiagnostic(diagnostic.id);
        
        console.log('[SW] Synced diagnostic:', diagnostic.id);
      } catch (error) {
        console.error('[SW] Failed to sync diagnostic:', diagnostic.id, error);
      }
    }
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// Placeholder functions for diagnostic sync
async function getPendingDiagnostics() {
  // Implement based on your storage mechanism
  return [];
}

async function syncDiagnosticToServer(diagnostic) {
  // Implement server sync logic
  console.log('[SW] Would sync diagnostic:', diagnostic);
}

async function removePendingDiagnostic(id) {
  // Implement removal from local storage
  console.log('[SW] Would remove pending diagnostic:', id);
}

// Periodic cleanup
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEANUP_CACHE') {
    event.waitUntil(
      caches.open(DYNAMIC_CACHE_NAME)
        .then((cache) => {
          return cache.keys().then((requests) => {
            // Remove old cache entries (older than 7 days)
            const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000);
            
            const deletePromises = requests
              .filter((request) => {
                // Simple heuristic - this could be improved with proper metadata
                return request.url.includes('timestamp') && 
                       parseInt(request.url.split('timestamp=')[1]) < cutoff;
              })
              .map((request) => cache.delete(request));
            
            return Promise.all(deletePromises);
          });
        })
    );
  }
});

console.log('[SW] Service worker script loaded');