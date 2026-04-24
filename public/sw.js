const SHELL_CACHE = 'truck-repair-assistant-shell-v2';
const ASSET_CACHE = 'truck-repair-assistant-assets-v2';
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/favicon.svg', '/logo.svg'];

function isNavigationRequest(request) {
  return request.mode === 'navigate';
}

function isCacheableAsset(requestUrl) {
  return requestUrl.origin === self.location.origin
    && (/^\/assets\//.test(requestUrl.pathname)
      || /\.(?:js|css|svg|png|jpg|jpeg|webp|gif|woff2?)$/i.test(requestUrl.pathname));
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key !== SHELL_CACHE && key !== ASSET_CACHE)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);

  if (requestUrl.origin !== self.location.origin) return;

  if (requestUrl.pathname.startsWith('/api/')) return;

  if (isNavigationRequest(event.request)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put('/index.html', responseClone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match('/index.html');
          return cached || Response.error();
        })
    );
    return;
  }

  if (!isCacheableAsset(requestUrl)) return;

  event.respondWith(
    caches.open(ASSET_CACHE).then((cache) =>
      cache.match(event.request).then((cached) => {
        if (cached) return cached;

        return fetch(event.request)
          .then((response) => {
            if (!response || response.status !== 200) return response;

            const responseClone = response.clone();
            cache.put(event.request, responseClone);
            return response;
          })
          .catch(() => caches.match('/index.html'));
      })
    )
  );
});