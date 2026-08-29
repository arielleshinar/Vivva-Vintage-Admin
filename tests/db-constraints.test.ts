import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { getOrCreateTestUser } from "./helpers/test-account";

// Database-level tests: proving the schema itself rejects impossible data
// (an "orphaned record" pointing at something that doesn't exist), the way
// a foreign key constraint is supposed to — completely independent of any
// validation our app code does. These use a real, signed-in test account
// with a real business, so the only reason an insert can fail is the
// constraint we're testing, not Row Level Security rejecting it first for
// an unrelated reason (a made-up business_id, for example).
//
// Postgres error code 23503 is "foreign_key_violation" — every test below
// checks specifically for that code, not just "some error happened", so a
// constraint quietly getting dropped would actually fail these tests
// instead of passing by accident.

const USER = {
  email: "ariellesc+rlstesta@gmail.com",
  password: "RlsTestPassword123",
  businessName: "RLS Test Business A",
};

describe("Database constraints: no orphaned records", () => {
  let businessId: string;
  let supabase: Awaited<ReturnType<typeof getOrCreateTestUser>>["supabase"];

  beforeAll(async () => {
    const account = await getOrCreateTestUser(USER);
    supabase = account.supabase;
    businessId = account.businessId;
  }, 30000);

  it("rejects a receipt whose item_id doesn't point to a real item", async () => {
    const { error } = await supabase.from("receipts").insert({
      business_id: businessId,
      item_id: randomUUID(), // a syntactically valid id that matches no real row
      sale_price: 10,
      receipt_number: `FK-TEST-${Date.now()}`,
    });

    expect(error).not.toBeNull();
    expect(error?.code).toBe("23503");
  });

  it("rejects an item whose category_id doesn't point to a real category", async () => {
    const { error } = await supabase.from("items").insert({
      business_id: businessId,
      category_id: randomUUID(),
      name: "FK Test Item",
      cost: 5,
      price: 10,
      status: "in_stock",
    });

    expect(error).not.toBeNull();
    expect(error?.code).toBe("23503");
  });
});

// Deleting a category with items attached is neither blocked nor cascaded —
// app/actions/inventory.ts relies on the categories→items foreign key being
// set up as `on delete set null`, so the items survive with category_id
// cleared instead of being deleted or the delete being rejected. This proves
// that's really how the schema (not just the app code) behaves.
describe("Database constraints: deleting a category clears it from that category's items", () => {
  let businessId: string;
  let supabase: Awaited<ReturnType<typeof getOrCreateTestUser>>["supabase"];

  beforeAll(async () => {
    const account = await getOrCreateTestUser(USER);
    supabase = account.supabase;
    businessId = account.businessId;
  }, 30000);

  it("sets category_id to null on an item instead of blocking the delete or deleting the item", async () => {
    const { data: category, error: categoryError } = await supabase
      .from("categories")
      .insert({ business_id: businessId, name: `DB-CONSTRAINT-TEST-CATEGORY-${Date.now()}` })
      .select("id")
      .single();
    if (categoryError || !category) throw new Error(`Could not seed category: ${categoryError?.message}`);

    const { data: item, error: itemError } = await supabase
      .from("items")
      .insert({
        business_id: businessId,
        category_id: category.id,
        name: "DB Constraint Test Item",
        cost: 5,
        price: 10,
        status: "in_stock",
      })
      .select("id")
      .single();
    if (itemError || !item) throw new Error(`Could not seed item: ${itemError?.message}`);

    const { error: deleteError } = await supabase.from("categories").delete().eq("id", category.id);
    expect(deleteError).toBeNull();

    const { data: reloadedItem, error: reloadError } = await supabase
      .from("items")
      .select("id, category_id")
      .eq("id", item.id)
      .single();

    expect(reloadError).toBeNull();
    expect(reloadedItem).not.toBeNull();
    expect(reloadedItem?.category_id).toBeNull();
  });
});

// Nothing about a vintage shop needs six- or seven-figure prices, but the
// column types shouldn't silently truncate or reject a value just because
// it's unusually large — e.g. from someone fat-fingering an extra zero.
describe("Database constraints: very large cost/price values round-trip correctly", () => {
  let businessId: string;
  let supabase: Awaited<ReturnType<typeof getOrCreateTestUser>>["supabase"];

  beforeAll(async () => {
    const account = await getOrCreateTestUser(USER);
    supabase = account.supabase;
    businessId = account.businessId;
  }, 30000);

  it("stores and returns a very large cost/price without truncation or overflow", async () => {
    const cost = 1_000_000;
    const price = 9_999_999.99;

    const { data: item, error: insertError } = await supabase
      .from("items")
      .insert({
        business_id: businessId,
        name: "DB Constraint Test — Large Value Item",
        cost,
        price,
        status: "in_stock",
      })
      .select("id, cost, price")
      .single();

    expect(insertError).toBeNull();
    expect(item?.cost).toBe(cost);
    expect(item?.price).toBe(price);
  });
});
