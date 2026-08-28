// Hand-written TypeScript types mirroring the actual Postgres tables in
// Supabase (see the schema SQL for the real source of truth — these are
// just how the app's code refers to each table's shape).
//
// Supabase can auto-generate these from your live schema (`supabase gen
// types typescript`), which also gives every query full autocomplete and
// catches typos in column names at compile time. We're deliberately not
// using that here: the schema is small and stable (4 tables), generating
// types needs either an interactive CLI login or a database credential,
// and the generated shape (separate Row/Insert/Update variants, a `Json`
// type) is more to read through than these four plain interfaces. The
// real cost of skipping it: TypeScript can't infer join shapes from
// foreign keys it doesn't know about — that's why app/inventory/page.tsx
// (and, following the same pattern, app/receipts/page.tsx) joins category
// and item names with a plain Map instead of a single embedded query;
// the embedded version type-checked incorrectly without generated types.
// If the schema starts changing often, generated types are worth
// revisiting.

/** A single shop owner's business. Created automatically the moment they sign up. */
export interface Business {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

/** A label a business sorts its items into, e.g. "Dresses". Optional on an item. */
export interface Category {
  id: string;
  business_id: string;
  name: string;
}

/** An item is either still on the shelf, or it's been sold. Nothing in between. */
export type ItemStatus = "in_stock" | "sold";

/** One piece of inventory — a thing the business has for sale (or has sold). */
export interface Item {
  id: string;
  business_id: string;
  category_id: string | null;
  name: string;
  cost: number;
  price: number;
  status: ItemStatus;
  created_at: string;
  sold_at: string | null;
}

/**
 * Proof of one completed sale. Created automatically (alongside marking the
 * item "sold") by the mark_item_sold() database function — see
 * app/actions/inventory.ts's markItemSold(). Receipts are never edited or
 * deleted by the app; they're meant to be a permanent record.
 */
export interface Receipt {
  id: string;
  item_id: string;
  business_id: string;
  sale_price: number;
  receipt_number: string;
  created_at: string;
}
