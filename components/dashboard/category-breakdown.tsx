import { formatPercent, type CategoryStats } from "@/lib/dashboard/stats";

interface CategoryBreakdownProps {
  categories: CategoryStats[];
}

/**
 * The table below the stat cards, breaking the same kind of numbers down
 * one row per category (e.g. "Dresses: 100% sell-through") instead of one
 * total for the whole shop. Read-only — this table has no buttons, since
 * you can't edit categories from the dashboard (that happens on the
 * inventory page).
 */
export function CategoryBreakdown({ categories }: CategoryBreakdownProps) {
  return (
    <div className="mt-8 overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          <tr>
            <th className="px-4 py-3 font-medium">Category</th>
            <th className="px-4 py-3 font-medium">Items</th>
            <th className="px-4 py-3 font-medium">Sold</th>
            <th className="px-4 py-3 font-medium">Sell-through</th>
            <th className="px-4 py-3 font-medium">Avg. margin</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {categories.map((category) => (
            <tr key={category.categoryId}>
              <td className="px-4 py-3 text-zinc-950 dark:text-zinc-50">
                {category.categoryName}
              </td>
              <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                {category.totalItems}
              </td>
              <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                {category.soldItems}
              </td>
              <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                {formatPercent(category.sellThroughRate)}
              </td>
              <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                {formatPercent(category.avgMarginPercent)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
