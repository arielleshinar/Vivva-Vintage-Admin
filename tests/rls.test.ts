import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";

// Integration tests proving Row Level Security actually blocks cross-tenant
// access at the database level — not just that our app code happens to
// filter correctly. These hit the real Supabase project configured in
// .env.local, using two real, reusable test accounts, signed in exactly
// the way a real user would be (no elevated/service-role access).
//
// "User A" owns a small amount of seeded data (one category, one item,
// one receipt). Every test below tries to touch that data while signed in
// as "User B" — a completely unrelated business — and expects it to be
// invisible/untouchable, exactly as if it didn't exist.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const USER_A = {
  email: "ariellesc+rlstesta@gmail.com",
  password: "RlsTestPassword123",
  businessName: "RLS Test Business A",
};
const USER_B = {
  email: "ariellesc+rlstestb@gmail.com",
  password: "RlsTestPassword123",
  businessName: "RLS Test Business B",
};

/**
 * Signs a test user in, creating both the auth account and its business
 * the first time this ever runs, and just signing in on every run after —
 * so repeated test runs reuse the same two accounts instead of piling new
 * ones up in the Supabase project.
 */
async function getOrCreateTestUser(user: typeof USER_A) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const signInResult = await supabase.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });

  // Sign-in fails the very first time this ever runs (the account doesn't
  // exist yet) — fall back to creating it. Every run after this, sign-in
  // succeeds and signUp() never gets called.
  const authResult = signInResult.error
    ? await supabase.auth.signUp({ email: user.email, password: user.password })
    : signInResult;

  if (authResult.error || !authResult.data.user || !authResult.data.session) {
    throw new Error(
      `Could not sign in or create RLS test user ${user.email}: ${
        authResult.error?.message ?? "no session returned — is 'Confirm email' still enabled in Supabase?"
      }`
    );
  }

  const userId = authResult.data.user.id;

  const { data: existingBusiness } = await supabase
    .from("businesses")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  let businessId: string | undefined = existingBusiness?.id;

  if (!businessId) {
    const { data: newBusiness, error } = await supabase
      .from("businesses")
      .insert({ user_id: userId, name: user.businessName })
      .select("id")
      .single();

    if (error || !newBusiness) {
      throw new Error(`Could not create a business for ${user.email}: ${error?.message}`);
    }
    businessId = newBusiness.id;
  }

  // Re-check explicitly (rather than trusting the reassignment above) so
  // TypeScript can confirm businessId is definitely a string by this
  // point, not "string | undefined".
  if (!businessId) {
    throw new Error(`Could not resolve a business id for ${user.email}`);
  }

  return { supabase, userId, businessId };
}

/**
 * Makes sure User A's business has one known category, item, and receipt
 * to use as the "target" data in the cross-tenant tests below. Reuses them
 * if a previous run already created them, so the probe data is stable
 * across runs instead of growing every time.
 */
async function seedProbeData(supabase: SupabaseClient, businessId: string) {
  const { data: existingCategory } = await supabase
    .from("categories")
    .select("id")
    .eq("business_id", businessId)
    .eq("name", "RLS Probe Category")
    .maybeSingle();

  let categoryId = existingCategory?.id as string | undefined;
  if (!categoryId) {
    const { data, error } = await supabase
      .from("categories")
      .insert({ business_id: businessId, name: "RLS Probe Category" })
      .select("id")
      .single();
    if (error || !data) throw new Error(`Could not seed probe category: ${error?.message}`);
    categoryId = data.id;
  }

  const { data: existingItem } = await supabase
    .from("items")
    .select("id")
    .eq("business_id", businessId)
    .eq("name", "RLS Probe Item")
    .maybeSingle();

  let itemId = existingItem?.id as string | undefined;
  if (!itemId) {
    const { data, error } = await supabase
      .from("items")
      .insert({
        business_id: businessId,
        category_id: categoryId,
        name: "RLS Probe Item",
        cost: 10,
        price: 20,
        status: "in_stock",
      })
      .select("id")
      .single();
    if (error || !data) throw new Error(`Could not seed probe item: ${error?.message}`);
    itemId = data.id;
  }

  const { data: existingReceipt } = await supabase
    .from("receipts")
    .select("id")
    .eq("business_id", businessId)
    .eq("receipt_number", "RLS-PROBE-0001")
    .maybeSingle();

  let receiptId = existingReceipt?.id as string | undefined;
  if (!receiptId) {
    const { data, error } = await supabase
      .from("receipts")
      .insert({
        business_id: businessId,
        item_id: itemId,
        sale_price: 20,
        receipt_number: "RLS-PROBE-0001",
      })
      .select("id")
      .single();
    if (error || !data) throw new Error(`Could not seed probe receipt: ${error?.message}`);
    receiptId = data.id;
  }

  return { categoryId, itemId, receiptId };
}

describe("Row Level Security: cross-tenant isolation", () => {
  let userA: Awaited<ReturnType<typeof getOrCreateTestUser>>;
  let userB: Awaited<ReturnType<typeof getOrCreateTestUser>>;
  let probe: Awaited<ReturnType<typeof seedProbeData>>;

  beforeAll(async () => {
    userA = await getOrCreateTestUser(USER_A);
    userB = await getOrCreateTestUser(USER_B);
    probe = await seedProbeData(userA.supabase, userA.businessId);
  }, 30000);

  it("sanity check: User A can see their own seeded data (proves the tests below are testing isolation, not a broken 'deny everything' policy)", async () => {
    const { data } = await userA.supabase
      .from("items")
      .select("id")
      .eq("id", probe.itemId)
      .maybeSingle();

    expect(data).not.toBeNull();
  });

  it("User B cannot see User A's business row", async () => {
    const { data } = await userB.supabase
      .from("businesses")
      .select("id")
      .eq("id", userA.businessId)
      .maybeSingle();

    expect(data).toBeNull();
  });

  it("User B cannot see User A's category", async () => {
    const { data } = await userB.supabase
      .from("categories")
      .select("id")
      .eq("id", probe.categoryId)
      .maybeSingle();

    expect(data).toBeNull();
  });

  it("User B cannot see User A's item", async () => {
    const { data } = await userB.supabase
      .from("items")
      .select("id")
      .eq("id", probe.itemId)
      .maybeSingle();

    expect(data).toBeNull();
  });

  it("User B cannot see User A's receipt", async () => {
    const { data } = await userB.supabase
      .from("receipts")
      .select("id")
      .eq("id", probe.receiptId)
      .maybeSingle();

    expect(data).toBeNull();
  });

  it("User B's attempt to update User A's item silently affects zero rows", async () => {
    const { data } = await userB.supabase
      .from("items")
      .update({ name: "Hijacked!" })
      .eq("id", probe.itemId)
      .select();

    expect(data).toEqual([]);

    // Confirm, as User A, the item is genuinely untouched.
    const { data: stillA } = await userA.supabase
      .from("items")
      .select("name")
      .eq("id", probe.itemId)
      .single();
    expect(stillA?.name).toBe("RLS Probe Item");
  });

  it("User B's attempt to delete User A's category silently affects zero rows", async () => {
    const { data } = await userB.supabase
      .from("categories")
      .delete()
      .eq("id", probe.categoryId)
      .select();

    expect(data).toEqual([]);

    // Confirm, as User A, the category still exists.
    const { data: stillA } = await userA.supabase
      .from("categories")
      .select("id")
      .eq("id", probe.categoryId)
      .maybeSingle();
    expect(stillA).not.toBeNull();
  });

  it("User B cannot insert a category forged onto User A's business_id", async () => {
    const { error } = await userB.supabase
      .from("categories")
      .insert({ business_id: userA.businessId, name: "Forged Category" });

    expect(error).not.toBeNull();
  });

  it("User B cannot insert an item forged onto User A's business_id", async () => {
    const { error } = await userB.supabase.from("items").insert({
      business_id: userA.businessId,
      name: "Forged Item",
      cost: 1,
      price: 2,
      status: "in_stock",
    });

    expect(error).not.toBeNull();
  });
});
