const DB_NAME = "routine-hub-cache";
const STORE_NAME = "routine";
const CACHE_TTL = 6 * 60 * 60 * 1000; // Revalidate at most once every 6 hours.

export type CachedRoutine = {
  entries: any[];
  version: any;
  versions: any[];
  cachedAt: number;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getCachedRoutine(key = "latest"): Promise<CachedRoutine | null> {
  if (typeof window === "undefined" || !("indexedDB" in window)) return null;

  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(key);
      req.onsuccess = () => resolve((req.result as CachedRoutine) || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function setCachedRoutine(
  data: Omit<CachedRoutine, "cachedAt">,
  key = "latest"
) {
  if (typeof window === "undefined" || !("indexedDB" in window)) return;

  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put({ ...data, cachedAt: Date.now() }, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Offline caching is an enhancement; the app should still work normally.
  }
}

export function isCacheFresh(cached: CachedRoutine | null) {
  return !!cached && Date.now() - cached.cachedAt < CACHE_TTL;
}

export function cacheKey(version?: string) {
  return version || "latest";
}
