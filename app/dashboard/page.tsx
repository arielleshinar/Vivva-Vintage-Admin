import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/supabase/get-business";
import { computeDashboardStats } from "@/lib/dashboard/stats";
import { EmptyState } from "@/components/dashboard/empty-state";
import { StatsSummary } from "@/components/dashboard/stats-summary";
import { CategoryBreakdown } from "@/components/dashboard/category-breakdown";

/**
 * The /dashboard page. This is a Server Component — it's an `async`
 * function that runs entirely on the server, fetches its own data
 * directly from Supabase, and sends the finished HTML to the browser (no
 * loading spinner, no separate API call from the client).
 *
 * The steps: confirm someone's logged in → look up their business →
 * fetch that business's categories, items, and receipts → crunch the
 * numbers with computeDashboardStats() → render either an empty state or
 * the real stats.
 */
export default async function DashboardPage() {
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

  // Fetch everything the stats calculation needs, in parallel (rather than
  // one after another) since none of these three queries depend on each
  // other's results.
  const [
    { data: categories, error: categoriesError },
    { data: items, error: itemsError },
    { data: receipts, error: receiptsError },
  ] = await Promise.all([
    supabase.from("categories").select("id, name").eq("business_id", business.id),
    supabase
      .from("items")
      .select("id, cost, status, category_id")
      .eq("business_id", business.id),
    supabase
      .from("receipts")
      .select("item_id, sale_price")
      .eq("business_id", business.id),
  ]);

  if (categoriesError || itemsError || receiptsError) {
    return (
      <PageShell businessName={business.name}>
        <p className="mt-8 text-sm text-red-600 dark:text-red-400">
          Something went wrong loading your dashboard. Please try again.
        </p>
      </PageShell>
    );
  }

  // A quick lookup table: item id → what it actually sold for. Only sold
  // items will have an entry here; everything else falls back to `null`
  // below, which computeDashboardStats() knows means "not sold yet, don't
  // count it in the margin average."
  const salePriceByItemId = new Map(
    (receipts ?? []).map((receipt) => [receipt.item_id, receipt.sale_price])
  );

  const stats = computeDashboardStats(
    (items ?? []).map((item) => ({
      categoryId: item.category_id,
      cost: item.cost,
      status: item.status,
      salePrice: salePriceByItemId.get(item.id) ?? null,
    })),
    categories ?? []
  );

  return (
    <PageShell businessName={business.name}>
      {stats.totalItems === 0 ? (
        <EmptyState />
      ) : (
        <>
          <StatsSummary
            totalItems={stats.totalItems}
            soldItems={stats.soldItems}
            sellThroughRate={stats.sellThroughRate}
            avgMarginPercent={stats.avgMarginPercent}
          />
          <CategoryBreakdown categories={stats.categories} />
        </>
      )}
    </PageShell>
  );
}

/**
 * Shared page wrapper: the "Dashboard" heading, the business name
 * underneath it, and consistent padding/background — so every possible
 * state above (loading, error, empty, real data) looks like the same page.
 */
function PageShell({
  businessName,
  children,
}: {
  businessName?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex-1 bg-zinc-50 px-4 py-12 dark:bg-black">
      <div className="mx-auto w-full max-w-4xl">
        <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Dashboard
        </h1>
        {businessName && (
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {businessName}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}
