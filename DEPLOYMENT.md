# Routine Hub — 100% Free Deployment Guide

This project can run with **GitHub + Vercel + Supabase Free**.

## Important architecture

- **GitHub**: stores source code
- **Vercel**: hosts the Next.js website and API routes
- **Supabase PostgreSQL**: stores routine versions, courses, sections, teachers, rooms and schedules

The admin PDF upload does **not** need permanent file storage. The PDF is uploaded to the API, parsed in memory, and the extracted routine data is saved to PostgreSQL. Therefore no paid storage service is required.

---

## 1. Prepare the project locally

Do not commit `.env`.

```bash
npm install
cp .env.example .env
```

For a local test, fill in your database and admin values in `.env`.

Generate Prisma client:

```bash
npm run db:generate
```

---

## 2. Create a free Supabase database

1. Create a free Supabase account.
2. Create a new project.
3. Open **Project Settings -> Database**.
4. Copy the PostgreSQL connection string.
5. Add SSL if it is not already present (`sslmode=require`).

Set it as `DATABASE_URL`.

Example:

```env
DATABASE_URL="postgresql://..."
```

---

## 3. Create the database tables

With `DATABASE_URL` pointing to Supabase:

```bash
npm run db:push
```

This creates/updates the Prisma tables in your PostgreSQL database.

---

## 4. Test locally

```bash
npm run dev
```

Test:

- `/` public routine
- `/admin/login`
- `/admin`
- upload source PDF
- extract routine
- save extracted routine
- publish routine version
- student PDF download
- teacher PDF download

---

## 5. Push to GitHub

Create a new GitHub repository, then run:

```bash
git init
git add .
git commit -m "Deploy Routine Hub"
git branch -M main
git remote add origin YOUR_GITHUB_REPOSITORY_URL
git push -u origin main
```

Before pushing, verify `.env` is ignored:

```bash
git status
```

You should **not** see `.env` listed for commit.

---

## 6. Deploy to Vercel

1. Sign in to Vercel with GitHub.
2. Click **Add New -> Project**.
3. Import the `routine-hub` repository.
4. Keep the framework as **Next.js**.
5. Add these Environment Variables:

```text
DATABASE_URL
ADMIN_EMAIL
ADMIN_PASSWORD
AUTH_SECRET
```

6. Click **Deploy**.

The project automatically runs:

```text
prisma generate && next build
```

---

## 7. Production database setup

If you did not run `npm run db:push` locally against Supabase, run it once with your production `DATABASE_URL` before using the deployed admin panel.

After that:

1. Open your Vercel URL.
2. Login as admin.
3. Upload the official source routine PDF.
4. Extract and review records.
5. Save the extracted routine.
6. Publish the routine version.

---

## Security checklist

- Use a unique `ADMIN_PASSWORD`.
- Use a long random `AUTH_SECRET`.
- Never commit `.env`.
- Keep the GitHub repository private if you do not want your source code public.

## PDF note

The Routine Hub logo is explicitly included in the Vercel serverless bundle for both student and teacher PDF routes, so the generated PDF remains branded after deployment.
