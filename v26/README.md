# Routine Hub

Routine Hub is a DIU CSE class routine search and PDF generation system.

## Main features

- Student section routine search
- Teacher routine search
- Room routine search
- Admin-only source PDF upload
- Layout-aware routine extraction
- Routine version review and publishing
- Student and teacher PDF downloads
- Routine Hub branded PDF output
- Offline app shell + cached routine for Student/Teacher/Room browsing

## Free deployment

This project is prepared for:

**GitHub (code) + Vercel (hosting) + Supabase PostgreSQL (database)**

See [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment instructions.

## Local development

```bash
npm install
cp .env.example .env
npm run db:generate
npm run dev
```

For production database schema setup:

```bash
npm run db:push
```

## Offline

Open the site online once, wait for the routine to load, and perform one normal refresh while online. The service worker then caches the app shell/static assets and the routine is stored in IndexedDB. After that, Student, Teacher, and Room searches can be used without network access. See [OFFLINE_TESTING.md](./OFFLINE_TESTING.md).


## Offline / device-first routine cache
The public app loads the full published routine into IndexedDB on the first online visit. Subsequent refreshes read the complete routine from the device and do not call the public routine API again. Reconnection also does not trigger a fetch. The user can explicitly press the Refresh control to sync the latest routine when desired.
