const CACHE_VERSION = "routine-hub-v25";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const PAGE_CACHE = `${CACHE_VERSION}-pages`;
const DATA_CACHE = `${CACHE_VERSION}-data`;

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
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

function isNextAsset(url) {
  return url.pathname.startsWith("/_next/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/fonts/");
}

function isPublicRoutineApi(url) {
  return url.pathname.startsWith("/api/public/routine");
}

async function networkThenCache(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(cacheName);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    return caches.match(request);
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

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
  if (!sameOrigin(url)) return;

  // Keep admin/private routes out of the offline cache.
  if (url.pathname.startsWith("/admin") || url.pathname.startsWith("/api/admin")) return;

  if (isPublicRoutineApi(url)) {
    event.respondWith(networkThenCache(request, DATA_CACHE));
    return;
  }

  if (isNextAsset(url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkThenCache(request, PAGE_CACHE));
    return;
  }
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "ROUTINE_HUB_SW_SKIP_WAITING") self.skipWaiting();
});
