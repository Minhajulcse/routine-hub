# Routine Hub

Routine Hub is a DIU CSE class routine search and PDF generation system.

## Main features

- Student section routine search
- Teacher routine search
- Admin-only source PDF upload
- Layout-aware routine extraction
- RE_* section skipping
- Consecutive lab slot merging
- Routine version review and publishing
- Student and teacher PDF downloads
- Routine Hub branded PDF output

## Free deployment

This project is prepared for:

**GitHub (code) + Vercel (hosting) + Supabase PostgreSQL (database)**

See [DEPLOYMENT.md](./DEPLOYMENT.md) for the complete step-by-step guide.

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
