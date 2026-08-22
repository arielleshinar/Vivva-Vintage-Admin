import { formatPercent } from "@/lib/dashboard/stats";

interface StatsSummaryProps {
  totalItems: number;
  soldItems: number;
  sellThroughRate: number | null;
  avgMarginPercent: number | null;
}

export function StatsSummary({
  totalItems,
  soldItems,
  sellThroughRate,
  avgMarginPercent,
}: StatsSummaryProps) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <StatCard label="Sell-through rate" value={formatPercent(sellThroughRate)} />
      <StatCard label="Avg. margin" value={formatPercent(avgMarginPercent)} />
      <StatCard label="Items in stock" value={String(totalItems - soldItems)} />
      <StatCard label="Items sold" value={String(soldItems)} />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        {value}
      </p>
    </div>
  );
}
