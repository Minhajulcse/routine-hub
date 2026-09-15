"use client";

import { useEffect } from "react";

/**
 * Routine Hub keeps the routine itself in IndexedDB, so a Service Worker is
 * unnecessary for the main app shell. Removing it avoids stale Next.js
 * chunks being served after deployments, which can cause a dev/runtime
 * "1 error" overlay until a hard refresh is performed.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;

    (async () => {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));

        // Clear only caches created by service workers. IndexedDB routine
        // cache remains untouched, so offline routine data is preserved.
        if ("caches" in window) {
          const names = await caches.keys();
          await Promise.all(names.map((name) => caches.delete(name)));
        }

        // Once an old worker releases control, the next normal navigation is
        // loaded directly from Next.js instead of a stale shell/chunk cache.
        if (!cancelled && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({ type: "ROUTINE_HUB_SW_DISABLE" });
        }
      } catch {
        // Service-worker cleanup is optional; the app works without it.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
