"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/supabase/get-business";
import { reportRangeSchema } from "@/lib/validation/reports";
import { buildReportCsv, type ReportRow } from "@/lib/reports/csv";

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
      salePrice: salePriceByItemId.get(item.id) ?? 0,
      cost: item.cost,
    }))
    .sort((a, b) => a.soldAt.localeCompare(b.soldAt));

  return { success: true, csv: buildReportCsv(rows), filename };
}
