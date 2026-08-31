# Basic Scale Document — Vivva Admin

## What happens with dozens or hundreds of users

Every business's data is isolated by `business_id`, and a typical business likely holds a few hundred items at most. The app should perform fine at this scale on Supabase's default Postgres tier — the real risk isn't total user count, it's a single business's item count growing large on an unpaginated list, which is why pagination (below) matters more than the raw user count.

## Heaviest potential database queries

Two queries do real work: the dashboard's sell-through/margin aggregation (scans all of one business's items) and the report export (scans all sold items in a date range). Both are scoped tightly by `business_id` and indexed accordingly (below).

## Indexes

Verified directly against the live database (`select * from pg_indexes where schemaname = 'public'`), not assumed from a plan:

| Table | Index | Covers |
|---|---|---|
| `items` | `items_business_status_idx` on `(business_id, status)` | Sell-through calculations |
| `items` | `items_business_sold_at_idx` on `(business_id, sold_at)` | Report date-range queries |
| `receipts` | `receipts_business_id_idx` on `business_id` | Every receipt query, all filtered by business |
| `receipts` | `receipts_business_id_receipt_number_key` (unique) on `(business_id, receipt_number)` | Also guarantees receipt numbers can't collide within a business |
| `categories` | `categories_business_id_idx` on `business_id` | Category lookups |
| `businesses` | `businesses_user_id_idx` on `user_id` | Every RLS policy on every other table runs a subquery against this column (`business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())`), so this index backs literally every protected query in the app |

Every table also has its default primary-key index. Postgres does **not** auto-index foreign key columns — only primary keys get one automatically — so the `categories` and `businesses` indexes above were a real gap caught while writing this document, not a formality; they've since been added.

## Avoiding unnecessary data loading

Inventory and receipt queries filter by `business_id` explicitly in the query itself, not just relying on RLS to filter after the fact — RLS is the safety net, not the primary performance strategy.

## Pagination

Implemented: `/inventory` and `/receipts` both paginate at 25 items per page (`components/ui/pagination.tsx`), using `?page=N` in the URL and Supabase's `.range()` with an exact `count`. Verified live across a full 3-page split (25/25/12) with correct Previous/Next enabled/disabled states at both boundaries.

## Client/server separation

Data fetching and mutations happen entirely server-side — Server Components fetch, Server Actions mutate. The client only ever holds transient UI state (which row is being edited, a modal's open/closed state). No dataset is shipped to the browser beyond what's rendered on the current page, and no query logic runs client-side.

## Current limitations

- No caching layer beyond Next.js's own request-level behavior — dashboard stats are computed live on every load, not pre-aggregated.
- No background jobs — the report export is synchronous, which is fine at the data volumes a single small business generates, but wouldn't scale to a business with tens of thousands of sold items in one query.

## Future improvements for larger scale

- Pre-compute dashboard stats (a materialized view or a scheduled job) instead of live aggregation, once a business's item count gets large enough that live aggregation is noticeably slow.
- Move large report exports to an async "generate, then download when ready" flow instead of a synchronous request.
- Add a caching layer (e.g. Next.js's data cache, or Redis) for dashboard data that doesn't need to be second-fresh.
