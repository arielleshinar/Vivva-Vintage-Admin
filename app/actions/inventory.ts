"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/supabase/get-business";
import {
  categoryNameSchema,
  itemSchema,
  markSoldSchema,
} from "@/lib/validation/inventory";

export type InventoryActionState = {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

const NO_BUSINESS_ERROR: InventoryActionState = {
  error: "Could not find your business. Please contact support.",
};

function getId(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  return typeof value === "string" && value.length > 0 ? value : null;
}

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

  revalidatePath("/inventory");
  return { success: true };
}

export async function deleteCategory(
  _prevState: InventoryActionState,
  formData: FormData
): Promise<InventoryActionState> {
  const id = getId(formData, "id");
  if (!id) return { error: "Missing category id." };

  const supabase = await createClient();
  const business = await getCurrentBusiness(supabase);
  if (!business) return NO_BUSINESS_ERROR;

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

  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  return { success: true };
}

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

  // update+insert run inside a single Postgres transaction via this RPC so a
  // partial failure never leaves an item "sold" with no receipt — see the
  // mark_item_sold() function required in the database.
  const { error } = await supabase.rpc("mark_item_sold", {
    p_item_id: parsed.data.itemId,
    p_sale_price: parsed.data.salePrice,
  });

  if (error) {
    return {
      error:
        error.code === "P0001"
          ? "This item was already marked as sold."
          : "Couldn't mark item as sold. Please try again.",
    };
  }

  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  revalidatePath("/receipts");
  return { success: true };
}
