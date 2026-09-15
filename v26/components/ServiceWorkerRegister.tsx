"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;
    (async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });

        if (cancelled) return;
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
        // Keep the online app usable even when service-worker registration is unavailable.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
