# Offline testing

Routine Hub supports offline browsing after it has been opened online once and the service worker has been installed.

1. Run the app normally and open `http://localhost:3000` (or the deployed URL).
2. Wait for the routine to load and perform one normal page refresh while still online. This lets the service worker cache the app shell/assets and IndexedDB cache the routine.
3. Turn off Wi-Fi/network (or use the browser's Offline network emulation).
4. Open/refresh the same site. The cached app shell and cached routine remain available for Student, Teacher, and Room searches.
5. Turn the network back on; the app automatically attempts to refresh the routine.

Notes:
- Admin routes are intentionally not cached offline.
- PDF generation is server-side, so generating a new PDF while completely offline is not supported. Previously downloaded PDFs remain available from the browser/downloads folder.
- The app must have been opened online at least once before an offline session.
