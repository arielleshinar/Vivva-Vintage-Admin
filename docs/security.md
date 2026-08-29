# Basic Security Document — Vivva Admin

## Authentication

Handled entirely by Supabase Auth (email/password) — no custom auth logic is written. Sessions are managed via Supabase's own session tokens, read/written through `@supabase/ssr`'s cookie-based helpers so the session survives across Server Components and Server Actions.

## Authorization

Enforced primarily at the **database** level via Row Level Security — every table's policies check that a row's `business_id` belongs to the currently authenticated user (`auth.uid()`), not just in application code. This is verified directly against the live database in `tests/rls.test.ts`, not just assumed from the policy definitions: a second real account is used to attempt cross-tenant reads, updates, deletes, and forged inserts, and all are confirmed blocked.

## Logged-in-only actions

All inventory, receipt, and report pages require an active session. `proxy.ts` (this Next.js version's replacement for `middleware.ts`) redirects unauthenticated requests to `/login` before they reach any protected route — confirmed for all four protected routes, plus an arbitrary unlisted route, in `lib/supabase/proxy.test.ts`. Each page also independently checks for a session as a defensive fallback, in case a request somehow reached it without going through the proxy.

## Preventing access to other users' data

Row Level Security is the real enforcement layer — even if a bug in the UI or a manipulated request tried to read or write another business's row, Postgres itself would reject it, since access isn't gated by application logic alone. Every Server Action also explicitly filters by the current session's `business_id` rather than trusting one passed in from the client, so a forged `business_id` in a request never even reaches the database as the "correct" one to act on.

## Input validation

All inputs are re-validated server-side in Server Actions using Zod, before anything touches the database. Client-side validation (`required`, `type="number"`) exists only for instant feedback — it is never the actual security boundary, since a request can always be sent directly, bypassing the browser entirely.

## Protecting API calls

There's no separate public REST API — only Server Actions, which aren't callable the way a REST endpoint is. The real protection on every action is the combination of the session check plus RLS: no action trusts a `business_id` passed from the client without it being backed by the authenticated session.

## Storing secrets

Supabase's URL and **anon** key are stored in environment variables — `.env.local` locally (gitignored, never committed), Vercel's own environment variable settings in production. The app never uses the Supabase `service_role` key, which would bypass RLS entirely; using only the anon key means the database's own access rules are the actual security boundary even if these values were somehow exposed, rather than there being a hidden all-access key that must never leak.

## A specific, verified example: receipts can't be altered after creation

The `authenticated` Postgres role has no `UPDATE` or `DELETE` grant on the `receipts` table — confirmed by attempting both directly against a real receipt and getting `permission denied for table receipts` back from Postgres. This is a **database permission**, not a Row Level Security *policy* — RLS controls which rows a query can see or touch, while a `GRANT` controls whether an operation is allowed on the table at all, independent of which rows. In this case it means even the owning user, with a completely valid session and a receipt that genuinely belongs to their own business, still cannot edit or delete it — mirroring standard accounting practice where a receipt shouldn't be alterable once issued.

## Remaining security risks / future improvements

- No rate limiting on auth endpoints — vulnerable to brute-force login attempts at scale.
- No audit log of who changed what.
- No email verification enforcement in this version.
- Would add: rate limiting on login, an optional 2FA flow, and structured audit logging in a future version.
