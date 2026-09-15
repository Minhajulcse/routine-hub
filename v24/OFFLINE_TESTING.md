# Routine Hub — Offline Testing

## Local

1. Copy your real environment variables into `.env.local`.
2. Run `npm install`.
3. Run `npm run db:generate`.
4. Run `npm run build`.
5. Run `npm start`.
6. Open `http://localhost:3000` once while online.
7. Reload once while online so the service worker and routine cache are populated.
8. In Chrome DevTools → Network, select **Offline** and reload.
9. The public routine should still open from the cached app shell and IndexedDB data.

## Production

After deploying to Vercel, open the public site once online before testing offline. The browser cache is per-device/browser.

The public routine is cached in IndexedDB for up to 6 hours. Search suggestions are computed locally from the cached routine, so typing does not call the suggestions API.

The public routine API also sends a 5-minute CDN cache with stale-while-revalidate, reducing repeated database work when multiple users request the same routine.
