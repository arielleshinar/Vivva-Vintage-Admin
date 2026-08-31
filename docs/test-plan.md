# Test Specification Document — Vivva Admin

64 automated tests run via `npm test` (Vitest). Most of them — RLS, database constraints, mark-sold atomicity, report totals — run against the real, live Supabase project referenced by `.env.local`, not mocks, because the whole point of those tests is proving the *database* enforces the rules, not just the application code sitting in front of it.

UI-level behavior (does a form show an inline error, does clicking a button visually confirm a sale) was **not** automated with a browser-testing tool like Playwright or React Testing Library — neither is part of this project's dependencies. Instead it was verified by hand, repeatedly, throughout development and again against the live production deployment on Vercel. The assignment explicitly allows this ("documented manual tests, where appropriate"); test code and automated coverage below are for everything else.

## 1. Core Feature Tests

| Scenario | Coverage |
|---|---|
| User can sign up and log in | Manual — verified repeatedly during development and on the live Vercel deployment |
| User can create, edit, and delete an inventory item | Input validation automated (`lib/validation/inventory.test.ts`); full flow verified manually, including live on production |
| User can create and delete a category | Validation automated (`lib/validation/inventory.test.ts`); delete behavior against the real database automated (`tests/db-constraints.test.ts`) |
| User can mark an item as sold and a receipt is generated | Automated, including a real concurrent double-submit (`tests/mark-item-sold.test.ts`) |
| Dashboard correctly displays sell-through rate and margin by category | Automated (`lib/dashboard/stats.test.ts`); verified live |
| User can export an accountant report for a selected date range | Automated (`lib/reports/query.test.ts`, `lib/reports/csv.test.ts`); verified live end-to-end on production, including the actual `POST /reports` request succeeding |

## 2. Invalid Input Tests

All automated in `lib/validation/inventory.test.ts` and `lib/validation/reports.test.ts`:

- Negative or zero price is rejected
- `cost > price` (loss item) is allowed, not silently broken
- Missing required fields (name) are rejected
- Non-numeric input in cost/price is rejected
- A reversed report date range (end before start) is rejected
- A malformed or non-calendar date string is rejected

## 3. Core Business Process Tests

- Marking sold creates exactly one receipt, updates status — `tests/mark-item-sold.test.ts`
- Margin is correct across price/cost combinations, including zero-margin — `lib/dashboard/stats.test.ts`
- Sell-through recalculates correctly as item status changes — `lib/dashboard/stats.test.ts`
- Report totals match the sum of the individual sold items in range — `lib/reports/query.test.ts`, checked against hand-computed totals, not a circular self-check

## 4. Permission / Authorization Tests

- A logged-out user is redirected to `/login` from every protected route — `lib/supabase/proxy.test.ts` (7 tests, one per route plus a catch-all "anything unlisted is still protected by default" case)
- User A cannot read, update, insert-as, or delete User B's business, category, item, or receipt, even with a real but wrong session — `tests/rls.test.ts` (9 tests against the live database with two real accounts)

## 5. Database Tests

- RLS policies block cross-tenant reads/writes at the database level, independent of the UI — `tests/rls.test.ts`
- Foreign key constraints reject orphaned records (a receipt pointing at a fake item, an item pointing at a fake category) — `tests/db-constraints.test.ts`
- Deleting a category that still has items attached — `tests/db-constraints.test.ts` proves the actual chosen behavior: the item survives with `category_id` cleared to `null` (via `on delete set null`), rather than the delete being blocked or the item being deleted. This is a different specific rule than "block or reassign," which was the range of options originally considered — "clear the category" was the one actually implemented and is what's tested.

## 6. Edge Case Tests

- Marking the same item sold twice in genuine simultaneity (not just "quick succession" — an actual concurrent `Promise.all` race) creates exactly one receipt, not zero or two — `tests/mark-item-sold.test.ts`
- Dashboard stats don't divide by zero for a business with zero items — `lib/dashboard/stats.test.ts`
- A zero-sales report date range returns a valid empty CSV (header row only), not an error — `lib/reports/csv.test.ts`
- Very large cost/price values don't break calculation, persistence, or display — automated across three layers: the margin math itself (`lib/dashboard/stats.test.ts`), input validation (`lib/validation/inventory.test.ts`), and a real insert/read round-trip against the live database (`tests/db-constraints.test.ts`, a ₪9,999,999.99 price stored and read back exactly). UI display was checked manually against the live production deployment — the layout doesn't break or overflow, and (after a fix prompted by this exact check) large values render with proper thousands separators via the shared `formatMoney()` helper (`lib/format.ts`, `lib/format.test.ts`), e.g. `₪9,999,999.99` rather than `₪9999999.99`.

## 7. Basic UI Tests (manual)

Verified by hand, repeatedly, during development and again on the live production deployment:

- The Add Item form shows validation errors without a page reload
- The empty inventory state prompts "add your first item" rather than showing a bare table
- Navigation between dashboard, inventory, receipts, and reports works without errors — most recently reconfirmed live on `https://vivva-vintage-admin.vercel.app`
- Marking an item sold gives immediate visual confirmation: the row's status and available actions update in place
