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
