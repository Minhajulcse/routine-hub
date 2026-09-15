const CACHE_VERSION = "routine-hub-v28";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const PAGE_CACHE = `${CACHE_VERSION}-pages`;
const DATA_CACHE = `${CACHE_VERSION}-data`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const APP_SHELL_URL = new URL("/", self.location.origin).href;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll([APP_SHELL_URL, "/manifest.webmanifest", "/sw.js"]))
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => !key.startsWith(CACHE_VERSION))
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

function sameOrigin(url) {
  return url.origin === self.location.origin;
}

function isPublicRoutineApi(url) {
  return url.pathname.startsWith("/api/public/routine");
}

function isPrivate(url) {
  return url.pathname.startsWith("/admin") || url.pathname.startsWith("/api/admin");
}

async function networkThenCache(request, cacheName, fallbackRequest = request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(cacheName);
      await cache.put(fallbackRequest, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(fallbackRequest);
    return cached || (await caches.match(APP_SHELL_URL)) || Response.error();
  }
}

async function cacheThenNetwork(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) {
    fetch(request).then(async (response) => {
      if (response && response.ok) {
        const cache = await caches.open(cacheName);
        await cache.put(request, response.clone());
      }
    }).catch(() => {});
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(cacheName);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    return Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (!sameOrigin(url) || isPrivate(url)) return;

  if (isPublicRoutineApi(url)) {
    event.respondWith(networkThenCache(request, DATA_CACHE));
    return;
  }

  if (request.mode === "navigate") {
    // The app is a single-page public explorer. Always serve the cached root shell
    // when offline, regardless of reload/navigation request headers.
    event.respondWith(
      (async () => {
        const shellCache = await caches.open(PAGE_CACHE);
        const cachedRoot = await shellCache.match(APP_SHELL_URL);
        if (cachedRoot) {
          fetch(request).then(async (response) => {
            if (response && response.ok) await shellCache.put(APP_SHELL_URL, response.clone());
          }).catch(() => {});
          return cachedRoot;
        }

        try {
          const response = await fetch(request);
          if (response && response.ok) await shellCache.put(APP_SHELL_URL, response.clone());
          return response;
        } catch {
          return (await caches.match(APP_SHELL_URL)) || (await caches.match(request)) || Response.error();
        }
      })()
    );
    return;
  }

  event.respondWith(cacheThenNetwork(request, RUNTIME_CACHE));
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "ROUTINE_HUB_SW_SKIP_WAITING") self.skipWaiting();
});
