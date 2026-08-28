import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";

/**
 * Shown on the receipts page when there aren't any yet. Same
 * card-with-a-button shape as the dashboard's and inventory's empty
 * states — this one points to /inventory, since that's where a receipt
 * actually gets created (by marking an item sold).
 */
export function EmptyState() {
  return (
    <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-zinc-300 px-6 py-16 text-center dark:border-zinc-700">
      <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
        No receipts yet
      </h2>
      <p className="max-w-sm text-sm text-zinc-600 dark:text-zinc-400">
        Receipts appear here once you mark an item as sold.
      </p>
      <Link href="/inventory" className={`${buttonStyles} mt-2`}>
        Go to inventory
      </Link>
    </div>
  );
}
