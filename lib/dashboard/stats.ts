import type { ItemStatus } from "@/lib/types/database";

// All the "do the math" logic for the dashboard lives here, deliberately
// kept separate from the page/components that display it. That way the
// calculations can be tested and reused on their own — e.g.
// calculateMargin() below is also used by the reports CSV export.

/** The raw info this module needs about one item to compute stats — a trimmed-down view of the real `items` table row. */
export interface DashboardItem {
  categoryId: string | null;
  cost: number;
  status: ItemStatus;
  /** The item's actual sale price, from its receipt — null until it's sold. */
  salePrice: number | null;
}

/** The computed numbers for a single category, e.g. "Dresses". */
export interface CategoryStats {
  categoryId: string;
  categoryName: string;
  totalItems: number;
  soldItems: number;
  sellThroughRate: number | null;
  avgMarginPercent: number | null;
}

/** The full result computeDashboardStats() returns: shop-wide totals plus a breakdown per category. */
export interface DashboardStats {
  totalItems: number;
  soldItems: number;
  sellThroughRate: number | null;
  avgMarginPercent: number | null;
  categories: CategoryStats[];
}

// The bucket name used for items whose category was deleted (or that never
// had one) — the schema allows category_id to be null.
const UNCATEGORIZED_KEY = "uncategorized";

/**
 * The core margin formula: how much profit is left after cost. Kept as its
 * own tiny function so this exact formula only exists in one place — both
 * this file and lib/reports/csv.ts call it, instead of each writing
 * `price - cost` themselves.
 */
export function calculateMargin(price: number, cost: number): number {
  return price - cost;
}

/**
 * Given a list of items, computes:
 *   - sell-through rate: what % of them are marked "sold"
 *   - average margin %: how profitable the SOLD ones were, on average
 *
 * Both numbers are `null` (never 0, never NaN) when there's nothing to
 * measure yet — e.g. a brand-new category with zero items shows "N/A"
 * instead of a misleading "0%".
 */
function summarizeItems(items: DashboardItem[]) {
  const totalItems = items.length;
  const soldItems = items.filter((item) => item.status === "sold").length;
  const sellThroughRate =
    totalItems === 0 ? null : (soldItems / totalItems) * 100;

  // Margin only reflects realized sales, not listed prices on unsold stock —
  // an item that hasn't sold yet doesn't have a margin, only a projection.
  const marginPercents = items.flatMap((item) => {
    if (item.status !== "sold" || item.salePrice === null || item.salePrice <= 0) {
      return [];
    }
    return [(calculateMargin(item.salePrice, item.cost) / item.salePrice) * 100];
  });
  const avgMarginPercent =
    marginPercents.length === 0
      ? null
      : marginPercents.reduce((sum, m) => sum + m, 0) / marginPercents.length;

  return { totalItems, soldItems, sellThroughRate, avgMarginPercent };
}

/**
 * The main entry point the dashboard page calls. Takes every item and
 * category for the business, groups the items by category (including an
 * "Uncategorized" bucket), and runs summarizeItems() once for the whole
 * shop and once per category.
 */
export function computeDashboardStats(
  items: DashboardItem[],
  categories: { id: string; name: string }[]
): DashboardStats {
  // Pre-seed one empty bucket per real category (before looking at any
  // items) so that when we sort items into buckets below, each item lands
  // under its category's real name — instead of only discovering that name
  // the first time an item happens to reference it. Categories with zero
  // items get filtered out of the final list further down.
  const groups = new Map<string, { name: string; items: DashboardItem[] }>();
  for (const category of categories) {
    groups.set(category.id, { name: category.name, items: [] });
  }

  for (const item of items) {
    const key = item.categoryId ?? UNCATEGORIZED_KEY;
    if (!groups.has(key)) {
      groups.set(key, { name: "Uncategorized", items: [] });
    }
    groups.get(key)!.items.push(item);
  }

  const categoryStats = Array.from(groups.entries())
    .filter(([, group]) => group.items.length > 0)
    .map(([categoryId, group]) => ({
      categoryId,
      categoryName: group.name,
      ...summarizeItems(group.items),
    }))
    .sort((a, b) => a.categoryName.localeCompare(b.categoryName));

  return { ...summarizeItems(items), categories: categoryStats };
}

/** Turns a number (or null) into display text: "42.0%" or "N/A". */
export function formatPercent(value: number | null): string {
  return value === null ? "N/A" : `${value.toFixed(1)}%`;
}
