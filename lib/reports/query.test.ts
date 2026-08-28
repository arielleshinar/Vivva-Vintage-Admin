import { beforeAll, describe, expect, it } from "vitest";
import { getOrCreateTestUser } from "@/tests/helpers/test-account";
import { getSoldItemsInRange } from "./query";

// "Export report totals match the sum of individual sold items in that
// date range" — from the test plan. Seeds a known, fixed set of sold
// items (two inside a date window, one outside it, one never sold at
// all) and checks getSoldItemsInRange() returns exactly the right ones,
// and that summing their prices matches a total we computed by hand.

const USER = {
  email: "ariellesc+rlstesta@gmail.com",
  password: "RlsTestPassword123",
  businessName: "RLS Test Business A",
};

// A fixed, clearly-synthetic date window that only this test ever uses —
// so its exact-total assertions can't be thrown off by unrelated data
// from other tests or real usage.
const IN_RANGE_DATE = "2020-06-15T12:00:00.000Z";
const OUT_OF_RANGE_DATE = "2020-01-01T12:00:00.000Z";
const RANGE_START = "2020-06-01T00:00:00.000Z";
const RANGE_END = "2020-06-30T23:59:59.999Z";

type TestSupabase = Awaited<ReturnType<typeof getOrCreateTestUser>>["supabase"];

/** Seeds a sold item (with a matching receipt) at a specific sold_at date, or reuses one already created by a previous run. */
async function ensureSoldItem(
  supabase: TestSupabase,
  businessId: string,
  name: string,
  args: { cost: number; salePrice: number; soldAt: string }
) {
  const { data: existing } = await supabase
    .from("items")
    .select("id")
    .eq("business_id", businessId)
    .eq("name", name)
    .maybeSingle();
  if (existing) return;

  const { data: item, error: itemError } = await supabase
    .from("items")
    .insert({
      business_id: businessId,
      name,
      cost: args.cost,
      price: args.salePrice,
      status: "sold",
      sold_at: args.soldAt,
    })
    .select("id")
    .single();
  if (itemError || !item) throw new Error(`Could not seed ${name}: ${itemError?.message}`);

  const { error: receiptError } = await supabase.from("receipts").insert({
    business_id: businessId,
    item_id: item.id,
    sale_price: args.salePrice,
    receipt_number: `REPORT-QUERY-TEST-${name.replace(/\s+/g, "-")}`,
  });
  if (receiptError) {
    throw new Error(`Could not seed a receipt for ${name}: ${receiptError.message}`);
  }
}

/** Seeds an item that's never been sold, or reuses one already created by a previous run. */
async function ensureUnsoldItem(supabase: TestSupabase, businessId: string, name: string) {
  const { data: existing } = await supabase
    .from("items")
    .select("id")
    .eq("business_id", businessId)
    .eq("name", name)
    .maybeSingle();
  if (existing) return;

  const { error } = await supabase
    .from("items")
    .insert({ business_id: businessId, name, cost: 5, price: 15, status: "in_stock" });
  if (error) throw new Error(`Could not seed ${name}: ${error.message}`);
}

describe("getSoldItemsInRange", () => {
  let supabase: TestSupabase;
  let businessId: string;

  beforeAll(async () => {
    const account = await getOrCreateTestUser(USER);
    supabase = account.supabase;
    businessId = account.businessId;

    await ensureSoldItem(supabase, businessId, "Report Query Test — In Range A", {
      cost: 20,
      salePrice: 50,
      soldAt: IN_RANGE_DATE,
    });
    await ensureSoldItem(supabase, businessId, "Report Query Test — In Range B", {
      cost: 15,
      salePrice: 40,
      soldAt: IN_RANGE_DATE,
    });
    await ensureSoldItem(supabase, businessId, "Report Query Test — Out Of Range", {
      cost: 10,
      salePrice: 30,
      soldAt: OUT_OF_RANGE_DATE,
    });
    await ensureUnsoldItem(supabase, businessId, "Report Query Test — Unsold");
  }, 30000);

  it("only includes items sold within the given date range — excluding out-of-range and unsold items", async () => {
    const rows = await getSoldItemsInRange(supabase, businessId, RANGE_START, RANGE_END);
    const names = rows.map((row) => row.itemName);

    expect(names).toContain("Report Query Test — In Range A");
    expect(names).toContain("Report Query Test — In Range B");
    expect(names).not.toContain("Report Query Test — Out Of Range");
    expect(names).not.toContain("Report Query Test — Unsold");
  });

  it("totals match the sum of the individual sold items in range", async () => {
    const rows = await getSoldItemsInRange(supabase, businessId, RANGE_START, RANGE_END);
    const ourRows = rows.filter((row) => row.itemName.startsWith("Report Query Test — In Range"));

    const totalSalePrice = ourRows.reduce((sum, row) => sum + row.salePrice, 0);
    const totalMargin = ourRows.reduce((sum, row) => sum + (row.salePrice - row.cost), 0);

    // Hand-computed from what we seeded above: (50 + 40) sale price,
    // (50-20) + (40-15) margin. If the query double-counted, missed a
    // row, or used the wrong price field, these would be wrong.
    expect(totalSalePrice).toBe(90);
    expect(totalMargin).toBe(55);
  });
});
