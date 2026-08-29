# Vivva Admin

A back-office web app for small vintage/resale sellers to track inventory, sales, and margins, and to export accountant-ready sales reports — replacing the spreadsheet most sellers start with. Each signed-up user gets their own isolated "business": their own inventory, categories, receipts, and reports, invisible to every other user.

**Live app:** https://vivva-vintage-admin.vercel.app

## Tech stack

- [Next.js](https://nextjs.org) (App Router) + [TypeScript](https://www.typescriptlang.org)
- [Supabase](https://supabase.com) — Postgres database, authentication, and Row Level Security (no separate backend/API — all data access goes through Supabase directly or through Next.js Server Actions)
- [Zod](https://zod.dev) — input validation
- [Vitest](https://vitest.dev) — automated tests, including real integration tests against a live Supabase project
- Deployed on [Vercel](https://vercel.com)

## Running it locally

**1. Install dependencies**

```bash
npm install
```

**2. Set up environment variables**

Create a file called `.env.local` in the project root with:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Both values come from your Supabase project's dashboard, under **Project Settings → API**:
- `NEXT_PUBLIC_SUPABASE_URL` is the **Project URL**
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` is the **anon / public** key (not the `service_role` key — that one must never be used in this project, since it bypasses Row Level Security)

These are safe to expose to the browser (that's what the `NEXT_PUBLIC_` prefix means) — access to real data is controlled by Supabase's Row Level Security policies on the database itself, not by keeping this key secret.

**3. Start the dev server**

```bash
npm run dev
```

The app runs at [http://localhost:3000](http://localhost:3000).

## Running the tests

```bash
npm test
```

This runs the full Vitest suite once. Some tests (RLS, database constraints, mark-sold atomicity, report totals) run against the real Supabase project referenced by your `.env.local`, not mocks — so a working `.env.local` is required for the full suite to pass. Use `npm run test:watch` to re-run tests automatically as you edit files.

## Other scripts

```bash
npm run build   # production build
npm run start   # run a production build locally
npm run lint    # ESLint
```
