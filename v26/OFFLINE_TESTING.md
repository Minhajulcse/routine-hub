# Offline testing

1. Open the app online and let the home page fully load.
2. Search at least one section, teacher, and room so routine data is cached.
3. Refresh once while online.
4. Turn the network off.
5. Hard refresh the page (Ctrl+R / browser refresh).
6. Confirm the home page, Student/Teacher/Room searches, and Day/Week views still work.

The service worker uses versioned caches and caches all same-origin public GET assets needed by the app, so a hard browser refresh can work offline after the app has been loaded online once.


### Device-first API test
1. Open the public site while online and wait for the routine to load.
2. Refresh once while online.
3. In DevTools Network, confirm the routine API is not called on that refresh.
4. Turn the network off and refresh the page normally.
5. Student, Teacher, Room, Day view, and Week view should still read the full routine from device cache.
6. Re-enable the network. The app should remain on the device snapshot until the user explicitly presses Refresh.
