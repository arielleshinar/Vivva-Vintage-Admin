import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";

export function EmptyState() {
  return (
    <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-zinc-300 px-6 py-16 text-center dark:border-zinc-700">
      <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
        No inventory yet
      </h2>
      <p className="max-w-sm text-sm text-zinc-600 dark:text-zinc-400">
        Add your first item to start tracking sell-through and margin.
      </p>
      <Link href="/inventory" className={`${buttonStyles} mt-2`}>
        Add your first item
      </Link>
    </div>
  );
}
