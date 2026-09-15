# Offline testing

1. Open the app online and let the home page fully load.
2. Search at least one section, teacher, and room so routine data is cached.
3. Refresh once while online.
4. Turn the network off.
5. Hard refresh the page (Ctrl+R / browser refresh).
6. Confirm the home page, Student/Teacher/Room searches, and Day/Week views still work.

The service worker uses versioned caches and caches all same-origin public GET assets needed by the app, so a hard browser refresh can work offline after the app has been loaded online once.
