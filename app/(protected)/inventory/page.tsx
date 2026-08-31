import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/supabase/get-business";
import { CategoryManager } from "@/components/inventory/category-manager";
import { AddItemForm } from "@/components/inventory/add-item-form";
import { ItemsTable } from "@/components/inventory/items-table";
import { EmptyState } from "@/components/inventory/empty-state";
import { Pagination } from "@/components/ui/pagination";
import type { ItemRowItem } from "@/components/inventory/item-row";

const PAGE_SIZE = 25;

/**
 * The /inventory page. Same overall shape as the dashboard page: confirm
 * login → look up the business → fetch data → render. The main difference
 * is this page needs both categories and items, and has to join them
 * together itself (so each item's row can show its category's name).
 */
export default async function InventoryPage(props: PageProps<"/inventory">) {
  const searchParams = await props.searchParams;
  // ?page=2 → page 2. Anything missing, non-numeric, or below 1 just
  // falls back to page 1, rather than erroring on a hand-edited URL.
  const page = Math.max(1, Number(searchParams.page) || 1);

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // proxy.ts already redirects unauthenticated requests before they reach
  // this page — this is a defensive fallback, not the primary auth boundary.
  if (!user) {
    redirect("/login");
  }

  const business = await getCurrentBusiness(supabase);

  if (!business) {
    return (
      <PageShell>
        <p className="text-sm text-red-600 dark:text-red-400">
          We couldn&apos;t find a business for your account. Please contact
          support.
        </p>
      </PageShell>
    );
  }

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const [
    { data: categories, error: categoriesError },
    { data: items, error: itemsError, count: itemCount },
  ] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name")
      .eq("business_id", business.id)
      .order("name"),
    supabase
      .from("items")
      .select("id, name, cost, price, status, category_id", { count: "exact" })
      .eq("business_id", business.id)
      .order("created_at", { ascending: false })
      .range(from, to),
  ]);

  if (categoriesError || itemsError) {
    return (
      <PageShell>
        <p className="mt-8 text-sm text-red-600 dark:text-red-400">
          Something went wrong loading your inventory. Please try again.
        </p>
      </PageShell>
    );
  }

  const categoryList = categories ?? [];
  // A quick lookup table: category id → its name, so we can attach the
  // right category name to each item below without a separate database
  // query per item. We do this join by hand instead of asking Supabase to
  // embed it directly (`.select("...,categories(name)")`) because without
  // generated types (see lib/types/database.ts), that embedded query
  // type-checked as an array of names instead of one — this Map-based
  // version sidesteps that entirely.
  const categoryNamesById = new Map(
    categoryList.map((category) => [category.id, category.name])
  );
  const itemList: ItemRowItem[] = (items ?? []).map((item) => ({
    id: item.id,
    name: item.name,
    cost: item.cost,
    price: item.price,
    status: item.status,
    categoryId: item.category_id,
    categoryName: item.category_id
      ? (categoryNamesById.get(item.category_id) ?? null)
      : null,
  }));

  // Use the total count, not this page's row count — otherwise paging past
  // the last real page (e.g. a hand-edited URL) would wrongly show the
  // "no inventory yet" empty state for a business that actually has items.
  const totalItems = itemCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

  return (
    <PageShell>
      <div className="mt-6 flex flex-col gap-6">
        <CategoryManager categories={categoryList} />
        <AddItemForm categories={categoryList} />
        {totalItems === 0 ? (
          <EmptyState />
        ) : (
          <div>
            <ItemsTable items={itemList} categories={categoryList} />
            <Pagination basePath="/inventory" page={page} totalPages={totalPages} />
          </div>
        )}
      </div>
    </PageShell>
  );
}

/** Shared page wrapper — same idea as the dashboard's PageShell, just labeled "Inventory". */
function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex-1 bg-zinc-50 px-4 py-12 dark:bg-black">
      <div className="mx-auto w-full max-w-4xl">
        <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Inventory
        </h1>
        {children}
      </div>
    </div>
  );
}
