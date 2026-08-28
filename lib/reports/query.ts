import type { SupabaseClient } from "@supabase/supabase-js";
import type { ReportRow } from "@/lib/reports/csv";

/**
 * Fetches every item sold within [rangeStart, rangeEnd] for a business,
 * joins in each one's real sale price (from its receipt) and category
 * name, and returns rows ready to hand to buildReportCsv().
 *
 * This used to live inline inside the exportReport() Server Action, but
 * was pulled out into its own function so it can be tested directly
 * against a real database — Server Actions depend on next/headers, which
 * only works inside an actual Next.js request, so exportReport() itself
 * can't easily be called from a plain test.
 *
 * Note the query below filters on `items.sold_at`, not
 * `receipts.created_at` — both would work (they're set at the same
 * moment), but `items.sold_at` has a database index specifically built for
 * this kind of date-range lookup, making it the faster choice.
 */
export async function getSoldItemsInRange(
  supabase: SupabaseClient,
  businessId: string,
  rangeStart: string,
  rangeEnd: string
): Promise<ReportRow[]> {
  const { data: items, error: itemsError } = await supabase
    .from("items")
    .select("id, name, cost, category_id, sold_at")
    .eq("business_id", businessId)
    .eq("status", "sold")
    .gte("sold_at", rangeStart)
    .lte("sold_at", rangeEnd);

  if (itemsError) {
    throw new Error(`Could not load sold items: ${itemsError.message}`);
  }

  const itemList = items ?? [];

  // No sales in this range — still a valid (empty) result. Returning
  // early here skips the receipts/categories lookups below, since
  // there'd be nothing to join them against anyway.
  if (itemList.length === 0) {
    return [];
  }

  const itemIds = itemList.map((item) => item.id);

  const [
    { data: receipts, error: receiptsError },
    { data: categories, error: categoriesError },
  ] = await Promise.all([
    supabase
      .from("receipts")
      .select("item_id, sale_price")
      .eq("business_id", businessId)
      .in("item_id", itemIds),
    supabase.from("categories").select("id, name").eq("business_id", businessId),
  ]);

  if (receiptsError || categoriesError) {
    throw new Error(
      `Could not load receipts/categories: ${receiptsError?.message ?? categoriesError?.message}`
    );
  }

  // Two lookup tables so we can attach each item's real sale price and
  // category name without a separate database query per item.
  const salePriceByItemId = new Map(
    (receipts ?? []).map((receipt) => [receipt.item_id, receipt.sale_price])
  );
  const categoryNamesById = new Map(
    (categories ?? []).map((category) => [category.id, category.name])
  );

  return itemList
    .map((item) => ({
      soldAt: item.sold_at,
      itemName: item.name,
      categoryName: item.category_id
        ? (categoryNamesById.get(item.category_id) ?? null)
        : null,
      // Uses the item's actual sale price from its receipt — not the
      // listed price — since those can differ (an item can sell for more
      // or less than it was priced at).
      salePrice: salePriceByItemId.get(item.id) ?? 0,
      cost: item.cost,
    }))
    .sort((a, b) => a.soldAt.localeCompare(b.soldAt));
}
