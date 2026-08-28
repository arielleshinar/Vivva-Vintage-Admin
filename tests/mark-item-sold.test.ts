import { describe, it, expect, beforeAll } from "vitest";
import { getOrCreateTestUser } from "./helpers/test-account";

// Business-process tests for the mark_item_sold() database function (see
// app/actions/inventory.ts's markItemSold action, which calls this exact
// RPC). The requirement from the test plan: marking an item sold must
// create exactly one receipt — never zero, and never two, even if the
// same request effectively happens twice at once.

const USER = {
  email: "ariellesc+rlstesta@gmail.com",
  password: "RlsTestPassword123",
  businessName: "RLS Test Business A",
};

/** Creates a fresh, uniquely-named in-stock item to mark sold — a new one every time, since selling is a one-way trip. */
async function createFreshInStockItem(
  supabase: Awaited<ReturnType<typeof getOrCreateTestUser>>["supabase"],
  businessId: string,
  label: string
) {
  const { data: item, error } = await supabase
    .from("items")
    .insert({
      business_id: businessId,
      name: `Mark Sold Test — ${label} — ${Date.now()}`,
      cost: 10,
      price: 25,
      status: "in_stock",
    })
    .select("id")
    .single();

  if (error || !item) {
    throw new Error(`Could not create test item: ${error?.message}`);
  }
  return item.id as string;
}

describe("mark_item_sold: atomicity", () => {
  let supabase: Awaited<ReturnType<typeof getOrCreateTestUser>>["supabase"];
  let businessId: string;

  beforeAll(async () => {
    const account = await getOrCreateTestUser(USER);
    supabase = account.supabase;
    businessId = account.businessId;
  }, 30000);

  it("marking an item sold updates its status and creates exactly one receipt", async () => {
    const itemId = await createFreshInStockItem(supabase, businessId, "single");

    const { error: rpcError } = await supabase.rpc("mark_item_sold", {
      p_item_id: itemId,
      p_sale_price: 25,
    });
    expect(rpcError).toBeNull();

    const { data: item } = await supabase
      .from("items")
      .select("status")
      .eq("id", itemId)
      .single();
    expect(item?.status).toBe("sold");

    const { data: receipts } = await supabase
      .from("receipts")
      .select("id")
      .eq("item_id", itemId);
    expect(receipts).toHaveLength(1);
  });

  it("marking the same item sold twice at the same instant still creates exactly one receipt", async () => {
    const itemId = await createFreshInStockItem(supabase, businessId, "double-submit");

    // Fire both calls at once rather than one after another — this is
    // what a double-click, or a slow network causing the form to submit
    // twice, actually looks like at the database level: two requests
    // racing each other, not two neatly ordered ones.
    const [first, second] = await Promise.all([
      supabase.rpc("mark_item_sold", { p_item_id: itemId, p_sale_price: 25 }),
      supabase.rpc("mark_item_sold", { p_item_id: itemId, p_sale_price: 25 }),
    ]);

    const results = [first, second];
    const succeeded = results.filter((r) => r.error === null);
    const failed = results.filter((r) => r.error !== null);

    // Exactly one call should win — never both succeeding, and never both
    // failing (that would mean the item never got sold at all).
    expect(succeeded).toHaveLength(1);
    expect(failed).toHaveLength(1);
    // P0001 is the error our database function raises specifically for
    // "this item isn't in_stock anymore" — confirms the *right* call
    // failed, for the right reason, not some unrelated error.
    expect(failed[0].error?.code).toBe("P0001");

    const { data: receipts } = await supabase
      .from("receipts")
      .select("id")
      .eq("item_id", itemId);
    expect(receipts).toHaveLength(1);
  });
});
