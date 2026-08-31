import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/supabase/get-business";
import { formatReceiptDate } from "@/lib/receipts/format";
import { formatMoney } from "@/lib/format";
import { EmptyState } from "@/components/receipts/empty-state";
import { Pagination } from "@/components/ui/pagination";

const PAGE_SIZE = 25;

/**
 * The /receipts page — a read-only list of every past sale, most recent
 * first. Unlike the dashboard and inventory pages, this one never writes
 * anything: receipts are only ever created by markItemSold() in
 * app/actions/inventory.ts, so there's no matching app/actions/receipts.ts
 * file.
 */
export default async function ReceiptsPage(props: PageProps<"/receipts">) {
  const searchParams = await props.searchParams;
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

  const {
    data: receipts,
    error: receiptsError,
    count: receiptCount,
  } = await supabase
    .from("receipts")
    .select("id, receipt_number, sale_price, created_at, item_id", { count: "exact" })
    .eq("business_id", business.id)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (receiptsError) {
    return (
      <PageShell>
        <p className="mt-8 text-sm text-red-600 dark:text-red-400">
          Something went wrong loading your receipts. Please try again.
        </p>
      </PageShell>
    );
  }

  // Each receipt only stores an item_id, not the item's name — so we look
  // up the names for every item referenced by these receipts in one extra
  // query (deduplicated via `new Set`), rather than one query per receipt.
  const itemIds = [...new Set((receipts ?? []).map((r) => r.item_id))];
  const itemNamesById = new Map<string, string>();

  if (itemIds.length > 0) {
    const { data: items } = await supabase
      .from("items")
      .select("id, name")
      .eq("business_id", business.id)
      .in("id", itemIds);

    for (const item of items ?? []) {
      itemNamesById.set(item.id, item.name);
    }
  }

  const receiptList = receipts ?? [];
  // Use the total count, not this page's row count — otherwise paging
  // past the last real page would wrongly show the "no receipts yet"
  // empty state for a business that actually has receipts.
  const totalReceipts = receiptCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalReceipts / PAGE_SIZE));

  return (
    <PageShell>
      {totalReceipts === 0 ? (
        <EmptyState />
      ) : (
        <div className="mt-6">
          <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
            <div className="min-w-[560px]">
              <div className="grid grid-cols-4 gap-4 border-b border-zinc-200 px-4 py-3 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                <span>Receipt #</span>
                <span>Item</span>
                <span>Sale price</span>
                <span>Date</span>
              </div>
              <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {/* Each row is itself a full <Link> (rather than a <tr> with
                    a click handler), so the whole row is clickable and it
                    works like a normal link — middle-click to open in a new
                    tab, etc. */}
                {receiptList.map((receipt) => (
                  <Link
                    key={receipt.id}
                    href={`/receipts/${receipt.id}`}
                    className="grid grid-cols-4 gap-4 px-4 py-3 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900"
                  >
                    <span className="text-zinc-950 dark:text-zinc-50">
                      {receipt.receipt_number}
                    </span>
                    <span className="text-zinc-600 dark:text-zinc-400">
                      {itemNamesById.get(receipt.item_id) ?? "—"}
                    </span>
                    <span className="text-zinc-600 dark:text-zinc-400">
                      {formatMoney(receipt.sale_price)}
                    </span>
                    <span className="text-zinc-600 dark:text-zinc-400">
                      {formatReceiptDate(receipt.created_at)}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
          <Pagination basePath="/receipts" page={page} totalPages={totalPages} />
        </div>
      )}
    </PageShell>
  );
}

/** Shared page wrapper — same idea as the other pages' PageShell, labeled "Receipts". */
function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex-1 bg-zinc-50 px-4 py-12 dark:bg-black">
      <div className="mx-auto w-full max-w-4xl">
        <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Receipts
        </h1>
        {children}
      </div>
    </div>
  );
}
