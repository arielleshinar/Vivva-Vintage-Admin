"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/supabase/get-business";
import {
  categoryNameSchema,
  itemSchema,
  markSoldSchema,
} from "@/lib/validation/inventory";

// Every mutation the inventory page can trigger: creating/deleting
// categories, creating/editing/deleting items, and marking an item sold.
// Each function follows the same shape: validate the form → confirm which
// business this is for → make the change in Supabase, scoped to that
// business → tell Next.js which pages need to refresh their data.

/** The shape every action in this file returns — same pattern as AuthActionState in app/actions/auth.ts. */
export type InventoryActionState = {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

// A reusable error for the (rare) case where getCurrentBusiness() can't
// find a business for the logged-in user.
const NO_BUSINESS_ERROR: InventoryActionState = {
  error: "Could not find your business. Please contact support.",
};

/** Pulls a plain string id (like `id` or `itemId`) out of a form submission, or null if it's missing/empty. */
function getId(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  return typeof value === "string" && value.length > 0 ? value : null;
}

/** Creates a new category for the current business. */
export async function createCategory(
  _prevState: InventoryActionState,
  formData: FormData
): Promise<InventoryActionState> {
  const parsed = categoryNameSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const business = await getCurrentBusiness(supabase);
  if (!business) return NO_BUSINESS_ERROR;

  const { error } = await supabase
    .from("categories")
    .insert({ business_id: business.id, name: parsed.data.name });

  if (error) {
    return { error: "Couldn't create category. Please try again." };
  }

  // Tells Next.js "the data behind /inventory has changed, refetch it" —
  // without this, the page wouldn't show the new category until a full
  // browser refresh.
  revalidatePath("/inventory");
  return { success: true };
}

/**
 * Deletes a category. Note this never touches the `items` table — the
 * database itself is set up (via `on delete set null`) to automatically
 * clear `category_id` on any items in this category, rather than deleting
 * them or blocking the delete. That's why there's no "are there items in
 * this category?" check here.
 */
export async function deleteCategory(
  _prevState: InventoryActionState,
  formData: FormData
): Promise<InventoryActionState> {
  const id = getId(formData, "id");
  if (!id) return { error: "Missing category id." };

  const supabase = await createClient();
  const business = await getCurrentBusiness(supabase);
  if (!business) return NO_BUSINESS_ERROR;

  // Filtering by business_id here isn't strictly required for security —
  // Supabase's Row Level Security policies already block cross-business
  // access at the database level — but it's good practice to be explicit
  // rather than rely on RLS alone, and it also means a wrong/stale id just
  // silently deletes nothing instead of (in theory) touching someone else's
  // row.
  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id)
    .eq("business_id", business.id);

  if (error) {
    return { error: "Couldn't delete category. Please try again." };
  }

  revalidatePath("/inventory");
  return { success: true };
}

/** Adds a new item to the current business's inventory. */
export async function createItem(
  _prevState: InventoryActionState,
  formData: FormData
): Promise<InventoryActionState> {
  const parsed = itemSchema.safeParse({
    name: formData.get("name"),
    cost: formData.get("cost"),
    price: formData.get("price"),
    categoryId: formData.get("categoryId"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const business = await getCurrentBusiness(supabase);
  if (!business) return NO_BUSINESS_ERROR;

  const { error } = await supabase.from("items").insert({
    business_id: business.id,
    category_id: parsed.data.categoryId,
    name: parsed.data.name,
    cost: parsed.data.cost,
    price: parsed.data.price,
  });

  if (error) {
    return { error: "Couldn't add item. Please try again." };
  }

  // Both pages show item counts/totals, so both need to refresh.
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  return { success: true };
}

/** Edits an existing item's name, cost, price, or category. */
export async function updateItem(
  _prevState: InventoryActionState,
  formData: FormData
): Promise<InventoryActionState> {
  const id = getId(formData, "id");
  if (!id) return { error: "Missing item id." };

  const parsed = itemSchema.safeParse({
    name: formData.get("name"),
    cost: formData.get("cost"),
    price: formData.get("price"),
    categoryId: formData.get("categoryId"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const business = await getCurrentBusiness(supabase);
  if (!business) return NO_BUSINESS_ERROR;

  const { error } = await supabase
    .from("items")
    .update({
      name: parsed.data.name,
      cost: parsed.data.cost,
      price: parsed.data.price,
      category_id: parsed.data.categoryId,
    })
    .eq("id", id)
    .eq("business_id", business.id);

  if (error) {
    return { error: "Couldn't update item. Please try again." };
  }

  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  return { success: true };
}

/** Permanently removes an item. */
export async function deleteItem(
  _prevState: InventoryActionState,
  formData: FormData
): Promise<InventoryActionState> {
  const id = getId(formData, "id");
  if (!id) return { error: "Missing item id." };

  const supabase = await createClient();
  const business = await getCurrentBusiness(supabase);
  if (!business) return NO_BUSINESS_ERROR;

  const { error } = await supabase
    .from("items")
    .delete()
    .eq("id", id)
    .eq("business_id", business.id);

  if (error) {
    return { error: "Couldn't delete item. Please try again." };
  }

  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Marks an item as sold. This is the one mutation in the whole app that
 * touches two tables at once (`items` and `receipts`), and it has to be
 * "all or nothing" — a sale should never end up half-recorded (item marked
 * sold with no receipt, or a receipt with no item update).
 *
 * The Supabase JS client can't guarantee that on its own, so instead of
 * doing two separate `.update()`/`.insert()` calls here, we call a
 * database function (`mark_item_sold`) via `.rpc()`. That function runs
 * both changes inside one Postgres transaction, so if anything goes wrong
 * partway through, the whole thing rolls back instead of leaving bad data.
 * It also refuses to run twice on the same item (the function only updates
 * items that are still "in_stock"), which is what stops a
 * double-click from creating two receipts for one sale.
 */
export async function markItemSold(
  _prevState: InventoryActionState,
  formData: FormData
): Promise<InventoryActionState> {
  const parsed = markSoldSchema.safeParse({
    itemId: formData.get("itemId"),
    salePrice: formData.get("salePrice"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const business = await getCurrentBusiness(supabase);
  if (!business) return NO_BUSINESS_ERROR;

  const { error } = await supabase.rpc("mark_item_sold", {
    p_item_id: parsed.data.itemId,
    p_sale_price: parsed.data.salePrice,
  });

  if (error) {
    // Postgres error code P0001 is what our database function raises when
    // it finds the item isn't "in_stock" anymore (i.e. it was already
    // sold) — we show a friendlier message for that specific case.
    return {
      error:
        error.code === "P0001"
          ? "This item was already marked as sold."
          : "Couldn't mark item as sold. Please try again.",
    };
  }

  // Three different pages show information that just changed: the item's
  // own status (inventory), the shop-wide numbers (dashboard), and the
  // brand-new receipt (receipts).
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  revalidatePath("/receipts");
  return { success: true };
}
