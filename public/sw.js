self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener("message", (event) => {
  if (event.data?.type === "ROUTINE_HUB_SW_DISABLE") {
    self.registration.unregister();
  }
});
self.addEventListener("fetch", () => {
  // No cache interception. Requests go directly to Next.js.
});
