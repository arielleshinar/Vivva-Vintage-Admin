# Technical Plan — Vivva Admin

## 1. System Components

- **Frontend**: Next.js 16 (App Router) + TypeScript + Tailwind CSS, deployed on Vercel
- **Backend**: Next.js Server Actions (same codebase, no separate backend service or REST API)
- **Database & Auth**: Supabase (Postgres + Supabase Auth + Row Level Security)
- **Hosting**: Vercel (app), Supabase (database)

## 2. Database Usage

Yes — Supabase Postgres, accessed via Supabase's JS client from server-side code (Server Components and Server Actions) using the `anon` key, with Row Level Security enforcing per-user data isolation on every table. The app never uses the `service_role` key, which would bypass RLS.

## 3. Core Tables

| Table | Key columns |
|---|---|
| `businesses` | `id`, `user_id` (FK → `auth.users`), `name`, `created_at` — one per user |
| `categories` | `id`, `business_id` (FK), `name` |
| `items` | `id`, `business_id` (FK), `category_id` (FK, nullable), `name`, `cost`, `price`, `status` (`in_stock`/`sold`), `created_at`, `sold_at` |
| `receipts` | `id`, `business_id` (FK), `item_id` (FK), `sale_price`, `receipt_number`, `created_at` |

RLS policy pattern applied to every table: `business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())`.

**Receipts are effectively immutable**: the `authenticated` database role has no `UPDATE` or `DELETE` grant on the `receipts` table — only `SELECT` and `INSERT`. This is a database *permission*, not an RLS *policy* (RLS controls which rows a query can touch; grants control which operations are allowed on the table at all) — verified directly by attempting both operations against a real receipt and confirming Postgres returns `permission denied for table receipts`. This mirrors standard accounting practice: a receipt shouldn't be alterable after issuance.

## 4. Application Pages

- `/login`, `/signup`
- `/dashboard` — sell-through rate & margin stats by category
- `/inventory` — list/add/edit items, paginated (25 per page)
- `/receipts` — list of past receipts, paginated (25 per page)
- `/receipts/[id]` — a single printable receipt
- `/reports` — select a date range, export a CSV

## 5. Server Actions

All data mutations go through Server Actions (no separate REST API). Actual functions, by file:

- `app/actions/auth.ts` — `signup`, `login`, `signOut`
- `app/actions/inventory.ts` — `createCategory`, `deleteCategory`, `createItem`, `updateItem`, `deleteItem`, `markItemSold`
- `app/actions/reports.ts` — `exportReport`

Dashboard stats and receipt creation are **not** separate Server Actions:
- Dashboard numbers are computed by a plain function (`lib/dashboard/stats.ts`'s `computeDashboardStats`) called directly from the `/dashboard` Server Component after it fetches items and categories — there's no round trip needed since it's a read, not a mutation.
- A receipt isn't created by its own action — `markItemSold` calls a single Postgres RPC function (`mark_item_sold`) that updates the item's status **and** inserts the receipt row in one atomic database transaction. This is what guarantees an item can never end up "sold" with zero or multiple receipts, including under a genuine double-submit race (verified with a real concurrent test — see the test plan).

## 6. Data Flow Between Frontend, Backend, and Database

User interacts with a page (e.g. marks an item sold) → the page calls a Server Action → the Server Action re-validates the input (Zod) and calls Supabase with the user's session → Postgres enforces RLS so only that user's rows are touched → the Server Action calls `revalidatePath` → the UI re-renders with fresh server-fetched data. There's no separate client-side data-fetching layer for these flows — no SWR/React Query, no global store.

## 7. Users and Permissions

Single role: business owner. Every authenticated user can only read/write rows belonging to their own `business_id`, enforced by Supabase RLS policies keyed on `auth.uid()`. No admin/staff roles — every business is fully self-contained and isolated from every other business (proven directly against the live database in `tests/rls.test.ts` and `tests/db-constraints.test.ts`, not just assumed from the UI never offering a way to cross the boundary).

## 8. External Libraries / Services

- **Supabase** (`@supabase/supabase-js`, `@supabase/ssr`) — database, auth, RLS
- **Vercel** — hosting/deployment, zero-config for Next.js
- **Zod** — input validation
- **Vitest** — test runner, including real integration tests against the live Supabase project

No PDF library and no charting library were added — see the note in the product spec on why.

## 9. Project Folder Structure

```
app/
  login/, signup/            — auth pages (outside the (protected) group — no nav shown)
  (protected)/               — a route group: the parentheses aren't part of the URL, so
                               (protected)/dashboard still serves at /dashboard
    layout.tsx               — renders the shared Nav above every page in this group
    dashboard/                — stats page
    inventory/                — item list, add/edit/mark-sold UI
    receipts/, receipts/[id]/ — receipt list + single printable receipt
    reports/                  — CSV export page
  actions/                  — Server Actions: auth.ts, inventory.ts, reports.ts
components/
  ui/          — shared building blocks: Button, FormField, SelectField, Pagination,
                 Nav + NavLinks (the persistent top bar and its active-link highlighting)
  dashboard/   — StatsSummary, CategoryBreakdown, EmptyState
  inventory/   — AddItemForm, CategoryManager, ItemsTable, ItemRow, EmptyState
  receipts/    — PrintButton, EmptyState
  reports/     — ReportForm
lib/
  supabase/    — client.ts (browser client), server.ts (server client), proxy.ts (route
                 protection), get-business.ts (shared "find the current user's business"
                 helper)
  dashboard/   — stats.ts (margin/sell-through math) + its tests
  reports/     — query.ts (the testable date-range query), csv.ts (CSV building) + tests
  validation/  — auth.ts, inventory.ts, reports.ts (Zod schemas) + tests
  receipts/    — format.ts (date formatting)
  format.ts    — formatMoney(): shared currency formatting (thousands separators) used
                 by both inventory and receipts, so a value never renders two different
                 ways in two different places
  types/       — database.ts (hand-written row types)
tests/
  rls.test.ts, db-constraints.test.ts, mark-item-sold.test.ts — real integration tests
  helpers/test-account.ts                                     — shared test-login helper
proxy.ts        — route protection (redirects unauthenticated requests to /login);
                  named proxy.ts, not middleware.ts, per this project's Next.js version
```

The nav itself (`components/ui/nav.tsx`) fetches the current business and renders a logout form (`signOut`) alongside links to all four protected pages; `components/ui/nav-links.tsx` is a small Client Component split out just to read the current URL (`usePathname`) and bold the active link — everything else about the nav is a plain Server Component. It's hidden with `print:hidden` so it never shows up on a printed receipt.

## 10. Core CREATE / READ / UPDATE / DELETE Operations

- **Create**: new business (on signup), new category, new item
- **Read**: list items (paginated), dashboard stats, list receipts (paginated), a single receipt, report rows for a date range
- **Update**: edit item, mark item as sold (status + `sold_at` + creates a receipt, atomically)
- **Delete**: delete item; delete category — deleting a category does **not** delete or block-on its items. The `categories → items` foreign key is set up as `on delete set null`, so any items in that category simply lose their category (`category_id` becomes `null`) rather than being deleted themselves or the delete being rejected. This was verified directly against the database, not just assumed from the code comment (see `tests/db-constraints.test.ts`).

## 11. State Management

- Almost entirely **server state** — Server Components fetch fresh data on every navigation; Server Actions call `revalidatePath` after a mutation so the next render reflects it.
- Forms use React 19's `useActionState` to track pending/error/success state for each Server Action, rather than manual `useState` + `fetch` wiring.
- Minimal **client state**: only local UI concerns like which row is mid-edit, or a modal being open — never the actual business data.
- No global state library (Redux/Zustand) — the app's data needs don't justify the added complexity.

## 12. Error Handling

- Server Actions return `{ success?, error?, fieldErrors? }` shapes instead of throwing to the UI — each action has its own typed state (e.g. `InventoryActionState`, `ReportActionState`).
- Field-level validation errors (from Zod) are shown inline next to the relevant input.
- A generic top-level error message is shown for anything that isn't a field problem (e.g. a database error) — never a raw exception or stack trace.

## 13. Input Validation

- **Server-side is the real boundary**: every Server Action re-validates its input with Zod before touching the database — the client is never trusted, since a request can always be forged.
- **Client-side** (`type="number"`, `required`) exists only for instant feedback, not as a security measure.
- Money fields (`cost`, `price`, `sale price`) use a shared Zod builder that enforces "must be a real number" and either "zero or more" (cost — a free/donated item is valid) or "greater than zero" (price/sale price).
- `cost > price` (a loss item) is deliberately allowed — it's flagged in the UI (shown as a loss in red), not rejected.

## 14. Core UX Planning

- Login and signup redirect to `/dashboard` first — the sell-through/margin numbers are what a returning user should see immediately. `/inventory` is the primary day-to-day working screen from there, built around a fast add-item flow (name, cost, price, category only).
- Marking sold is a single click that expands into a small inline "confirm sale price" form, not a full page navigation — it's the highest-frequency action.
- The dashboard shows sell-through rate and margin — the "why does this matter" numbers — before any raw inventory table.
- Empty states are explicit: a brand-new business's inventory page prompts "add your first item" rather than showing a bare empty table.
