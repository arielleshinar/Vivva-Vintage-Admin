import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/supabase/get-business";
import { formatReceiptDate } from "@/lib/receipts/format";
import { EmptyState } from "@/components/receipts/empty-state";

export default async function ReceiptsPage() {
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

  const { data: receipts, error: receiptsError } = await supabase
    .from("receipts")
    .select("id, receipt_number, sale_price, created_at, item_id")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false });

  if (receiptsError) {
    return (
      <PageShell businessName={business.name}>
        <p className="mt-8 text-sm text-red-600 dark:text-red-400">
          Something went wrong loading your receipts. Please try again.
        </p>
      </PageShell>
    );
  }

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

  return (
    <PageShell businessName={business.name}>
      {receiptList.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
          <div className="min-w-[560px]">
            <div className="grid grid-cols-4 gap-4 border-b border-zinc-200 px-4 py-3 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              <span>Receipt #</span>
              <span>Item</span>
              <span>Sale price</span>
              <span>Date</span>
            </div>
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
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
                    ${receipt.sale_price.toFixed(2)}
                  </span>
                  <span className="text-zinc-600 dark:text-zinc-400">
                    {formatReceiptDate(receipt.created_at)}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}

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
          Receipts
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
