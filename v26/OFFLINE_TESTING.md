# Offline Testing

1. Open the production site while online.
2. Stay on the page until the routine has loaded.
3. Search at least one Student, Teacher, and Room routine so the full routine dataset is cached.
4. Refresh once while online.
5. Turn off the network.
6. Open or reload `https://routine-hub-diu.vercel.app/` directly.
7. The cached public app shell should open even on a fresh navigation/reload.
8. Student, Teacher, Room, Day view, and Week view should read from the local cached dataset.
9. Use the app's manual refresh control only when online and when a newer routine is needed.

Admin and server-only PDF generation still require network access.
