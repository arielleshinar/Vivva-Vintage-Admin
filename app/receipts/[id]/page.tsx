import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/supabase/get-business";
import { formatReceiptDate } from "@/lib/receipts/format";
import { PrintButton } from "@/components/receipts/print-button";

export default async function ReceiptDetailPage(
  props: PageProps<"/receipts/[id]">
) {
  const { id } = await props.params;
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
    notFound();
  }

  const { data: receipt, error: receiptError } = await supabase
    .from("receipts")
    .select("id, receipt_number, sale_price, created_at, item_id")
    .eq("id", id)
    .eq("business_id", business.id)
    .maybeSingle();

  if (receiptError || !receipt) {
    notFound();
  }

  const { data: item } = await supabase
    .from("items")
    .select("name")
    .eq("id", receipt.item_id)
    .eq("business_id", business.id)
    .maybeSingle();

  return (
    <div className="flex-1 bg-zinc-50 px-4 py-12 dark:bg-black">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 flex items-center justify-between print:hidden">
          <Link
            href="/receipts"
            className="text-sm font-medium text-zinc-600 underline dark:text-zinc-400"
          >
            ← All receipts
          </Link>
          <PrintButton />
        </div>

        <div className="receipt-card rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-center">
            <h1 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
              {business.name}
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Receipt {receipt.receipt_number}
            </p>
          </div>

          <div className="my-6 border-t border-dashed border-zinc-300 dark:border-zinc-700" />

          <dl className="flex flex-col gap-3 text-sm">
            <Row label="Item" value={item?.name ?? "—"} />
            <Row label="Sale price" value={`$${receipt.sale_price.toFixed(2)}`} />
            <Row label="Date" value={formatReceiptDate(receipt.created_at)} />
          </dl>

          <div className="my-6 border-t border-dashed border-zinc-300 dark:border-zinc-700" />

          <p className="text-center text-xs text-zinc-400 dark:text-zinc-500">
            Thank you!
          </p>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd className="font-medium text-zinc-950 dark:text-zinc-50">{value}</dd>
    </div>
  );
}
