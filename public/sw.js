const CACHE_NAME = 'ipdfca-static-v1';

const SCOPE_PATHNAME = new URL(self.registration.scope).pathname.replace(/\/$/, '');
const withScope = (path) => `${SCOPE_PATHNAME}${path.startsWith('/') ? '' : '/'}${path}`;

const STATIC_ASSETS = [
  withScope('/'),
  withScope('/index.html'),
  withScope('/manifest.json'),
  withScope('/icons/icon-192.png'),
  withScope('/icons/icon-512.png'),
];

async function precacheStaticAssets(cache) {
  await Promise.all(
    STATIC_ASSETS.map(async (asset) => {
      try {
        await cache.add(asset);
      } catch (err) {
        // Ignore individual precache failures (e.g. missing icons during dev)
      }
    })
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await precacheStaticAssets(cache);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Only handle same-origin requests (avoid caching 3rd party resources)
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const indexUrl = withScope('/index.html');
        const cachedIndex = await cache.match(indexUrl);
        if (cachedIndex) return cachedIndex;

        try {
          const response = await fetch(indexUrl, { cache: 'no-store' });
          if (response && response.status === 200) {
            cache.put(indexUrl, response.clone());
          }
          return response;
        } catch (err) {
          if (cachedIndex) return cachedIndex;
          throw err;
        }
      })()
    );
    return;
  }

  // Cache-first for static assets
  const scopePrefix = `${SCOPE_PATHNAME}/`;
  const isWithinScope = url.pathname === SCOPE_PATHNAME || url.pathname.startsWith(scopePrefix);
  if (!isWithinScope) return;

  const isStaticAsset =
    url.pathname === withScope('/') ||
    url.pathname === withScope('/index.html') ||
    url.pathname.startsWith(withScope('/assets/')) ||
    url.pathname.startsWith(withScope('/icons/')) ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.mjs') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.jpeg') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.gif') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.json') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.woff') ||
    url.pathname.endsWith('.ttf');

  if (!isStaticAsset) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      if (cached) return cached;

      try {
        const response = await fetch(request);
        // Cache successful basic/cors responses
        if (response && (response.type === 'basic' || response.type === 'cors') && response.status === 200) {
          cache.put(request, response.clone());
        }
        return response;
      } catch (err) {
        throw err;
      }
    })()
  );
});
