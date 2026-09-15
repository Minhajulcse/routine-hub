const CACHE_VERSION = "routine-hub-v26";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const PAGE_CACHE = `${CACHE_VERSION}-pages`;
const DATA_CACHE = `${CACHE_VERSION}-data`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

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

function isPublicRoutineApi(url) {
  return url.pathname.startsWith("/api/public/routine");
}

function isPrivate(url) {
  return url.pathname.startsWith("/admin") || url.pathname.startsWith("/api/admin");
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
    return caches.match(request).then((cached) => cached || Response.error());
  }
}

async function cacheThenNetwork(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) {
    // Update in the background when possible.
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
    // Navigation is network-first, but ALWAYS falls back to the cached HTML shell.
    event.respondWith(networkThenCache(request, PAGE_CACHE));
    return;
  }

  // Cache every same-origin GET used by the public app (Next chunks, images,
  // fonts, manifests, RSC/data requests, etc.). This is what makes hard refresh
  // work offline instead of only making SPA navigation work offline.
  event.respondWith(cacheThenNetwork(request, RUNTIME_CACHE));
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "ROUTINE_HUB_SW_SKIP_WAITING") self.skipWaiting();
});
