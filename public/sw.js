const CACHE_NAME = 'ipdfca-static-v4';

const SCOPE_PATHNAME = new URL(self.registration.scope).pathname.replace(/\/$/, '');
const withScope = (path) => `${SCOPE_PATHNAME}${path.startsWith('/') ? '' : '/'}${path}`;
const STATIC_FILE_REGEX = /\.(?:css|js|mjs|json|png|jpg|jpeg|webp|svg|gif|ico|woff2?|ttf)$/i;

const CORE_ASSETS = [
  withScope('/'),
  withScope('/index.html'),
  withScope('/manifest.json'),
  withScope('/icons/icon-192.png'),
  withScope('/icons/icon-512.png'),
];

const isCacheableResponse = (response) =>
  response &&
  response.status === 200 &&
  (response.type === 'basic' || response.type === 'cors');

function toScopedPath(candidate) {
  try {
    const url = new URL(candidate, self.registration.scope);
    if (url.origin !== self.location.origin) return null;
    return url.pathname;
  } catch {
    return null;
  }
}

async function discoverBuildAssets() {
  const assets = new Set(CORE_ASSETS);

  try {
    const indexResponse = await fetch(withScope('/index.html'), { cache: 'no-store' });
    if (indexResponse.ok) {
      const html = await indexResponse.text();
      const attributeRegex = /(?:src|href)=["']([^"']+)["']/gi;
      let match;

      while ((match = attributeRegex.exec(html)) !== null) {
        const path = toScopedPath(match[1]);
        if (!path) continue;

        const isAppAsset = path.startsWith(withScope('/assets/')) || STATIC_FILE_REGEX.test(path);
        if (isAppAsset) {
          assets.add(path);
        }
      }
    }
  } catch {
    // Best effort: in dev or temporary network errors, continue with core assets.
  }

  try {
    const manifestResponse = await fetch(withScope('/manifest.json'), { cache: 'no-store' });
    if (manifestResponse.ok) {
      const manifest = await manifestResponse.json();
      if (Array.isArray(manifest.icons)) {
        for (const icon of manifest.icons) {
          if (!icon || typeof icon.src !== 'string') continue;
          const iconPath = toScopedPath(icon.src);
          if (iconPath) assets.add(iconPath);
        }
      }
    }
  } catch {
    // Best effort: manifest icons may not exist in dev mode.
  }

  return [...assets];
}

async function precacheStaticAssets(cache) {
  const assets = await discoverBuildAssets();
  await Promise.all(
    assets.map(async (asset) => {
      try {
        await cache.add(new Request(asset, { cache: 'reload' }));
      } catch {
        // Ignore individual precache failures so install keeps progressing.
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
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const indexUrl = withScope('/index.html');

        try {
          const response = await fetch(indexUrl, { cache: 'no-store' });
          if (isCacheableResponse(response)) {
            await cache.put(indexUrl, response.clone());
          }
          return response;
        } catch {
          const cachedIndex = await cache.match(indexUrl);
          if (cachedIndex) return cachedIndex;
          throw new Error('Offline sem app shell em cache.');
        }
      })()
    );
    return;
  }

  const scopePrefix = SCOPE_PATHNAME ? `${SCOPE_PATHNAME}/` : '/';
  const isWithinScope = url.pathname === SCOPE_PATHNAME || url.pathname.startsWith(scopePrefix);
  if (!isWithinScope) return;

  const isStaticAsset =
    url.pathname === withScope('/') ||
    url.pathname === withScope('/index.html') ||
    url.pathname.startsWith(withScope('/assets/')) ||
    url.pathname.startsWith(withScope('/icons/')) ||
    STATIC_FILE_REGEX.test(url.pathname);

  if (!isStaticAsset) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request, { ignoreSearch: true });

      if (cached) {
        event.waitUntil(
          (async () => {
            try {
              const fresh = await fetch(request);
              if (isCacheableResponse(fresh)) {
                await cache.put(request, fresh.clone());
              }
            } catch {
              // Keep serving cached version when network refresh fails.
            }
          })()
        );
        return cached;
      }

      const response = await fetch(request);
      if (isCacheableResponse(response)) {
        await cache.put(request, response.clone());
      }
      return response;
    })()
  );
});
