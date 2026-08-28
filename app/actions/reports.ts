"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/supabase/get-business";
import { reportRangeSchema } from "@/lib/validation/reports";
import { buildReportCsv, type ReportRow } from "@/lib/reports/csv";

/**
 * Same general shape as the other actions' state types, plus two extra
 * fields specific to this one: `csv` (the finished file's text) and
 * `filename` (what to name the download). The form component
 * (components/reports/report-form.tsx) watches for those two fields to
 * know when to trigger the actual browser download.
 */
export type ReportActionState = {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  csv?: string;
  filename?: string;
};

const GENERIC_ERROR: ReportActionState = {
  error: "Couldn't generate the report. Please try again.",
};

/**
 * Builds and returns a CSV export of everything sold in a given date
 * range. Steps: validate the two dates → find this business → find every
 * item marked "sold" in that range → look up each one's real sale price
 * (from its receipt) and category name → hand it all to buildReportCsv().
 *
 * Note the query below filters on `items.sold_at`, not
 * `receipts.created_at` — both would work (they're set at the same
 * moment), but `items.sold_at` has a database index specifically built for
 * this kind of date-range lookup, making it the faster choice.
 */
export async function exportReport(
  _prevState: ReportActionState,
  formData: FormData
): Promise<ReportActionState> {
  const parsed = reportRangeSchema.safeParse({
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { startDate, endDate } = parsed.data;

  const supabase = await createClient();
  const business = await getCurrentBusiness(supabase);
  if (!business) {
    return { error: "Could not find your business. Please contact support." };
  }

  const filename = `report-${startDate}-to-${endDate}.csv`;
  // The date inputs only give us a day (e.g. "2026-08-22"), so we expand
  // that into a full day's worth of time — midnight at the very start of
  // the start date, through one millisecond before midnight on the day
  // after the end date — so "sold on the end date" actually gets included.
  const rangeStart = `${startDate}T00:00:00.000Z`;
  const rangeEnd = `${endDate}T23:59:59.999Z`;

  const { data: items, error: itemsError } = await supabase
    .from("items")
    .select("id, name, cost, category_id, sold_at")
    .eq("business_id", business.id)
    .eq("status", "sold")
    .gte("sold_at", rangeStart)
    .lte("sold_at", rangeEnd);

  if (itemsError) {
    return GENERIC_ERROR;
  }

  const itemList = items ?? [];

  // No sales in this range — still a valid report, just an empty one.
  // Returning early here skips the receipts/categories lookups below,
  // since there'd be nothing to join them against anyway.
  if (itemList.length === 0) {
    return { success: true, csv: buildReportCsv([]), filename };
  }

  const itemIds = itemList.map((item) => item.id);

  const [
    { data: receipts, error: receiptsError },
    { data: categories, error: categoriesError },
  ] = await Promise.all([
    supabase
      .from("receipts")
      .select("item_id, sale_price")
      .eq("business_id", business.id)
      .in("item_id", itemIds),
    supabase.from("categories").select("id, name").eq("business_id", business.id),
  ]);

  if (receiptsError || categoriesError) {
    return GENERIC_ERROR;
  }

  // Two lookup tables so we can attach each item's real sale price and
  // category name without a separate database query per item.
  const salePriceByItemId = new Map(
    (receipts ?? []).map((receipt) => [receipt.item_id, receipt.sale_price])
  );
  const categoryNamesById = new Map(
    (categories ?? []).map((category) => [category.id, category.name])
  );

  const rows: ReportRow[] = itemList
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

  return { success: true, csv: buildReportCsv(rows), filename };
}
