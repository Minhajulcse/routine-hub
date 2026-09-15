"use client";

import { useEffect } from "react";

/**
 * Registers the offline app shell. The service worker uses versioned caches,
 * so new deployments replace old cached assets instead of serving stale chunks.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    (async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });

        await registration.update();

        if (registration.waiting) {
          registration.waiting.postMessage({ type: "ROUTINE_HUB_SW_SKIP_WAITING" });
        }

        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          worker?.addEventListener("statechange", () => {
            if (worker.state === "installed" && registration.waiting) {
              registration.waiting.postMessage({ type: "ROUTINE_HUB_SW_SKIP_WAITING" });
            }
          });
        });
      } catch {
        // Offline support is progressive; the app remains usable online.
      }
    })();

    return () => {};
  }, []);

  return null;
}
