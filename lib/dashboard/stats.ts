import type { ItemStatus } from "@/lib/types/database";

export interface DashboardItem {
  categoryId: string | null;
  cost: number;
  price: number;
  status: ItemStatus;
}

export interface CategoryStats {
  categoryId: string;
  categoryName: string;
  totalItems: number;
  soldItems: number;
  sellThroughRate: number | null;
  avgMarginPercent: number | null;
}

export interface DashboardStats {
  totalItems: number;
  soldItems: number;
  sellThroughRate: number | null;
  avgMarginPercent: number | null;
  categories: CategoryStats[];
}

const UNCATEGORIZED_KEY = "uncategorized";

export function calculateMargin(price: number, cost: number): number {
  return price - cost;
}

function summarizeItems(items: DashboardItem[]) {
  const totalItems = items.length;
  const soldItems = items.filter((item) => item.status === "sold").length;
  const sellThroughRate =
    totalItems === 0 ? null : (soldItems / totalItems) * 100;

  const marginPercents = items
    .filter((item) => item.price > 0)
    .map((item) => (calculateMargin(item.price, item.cost) / item.price) * 100);
  const avgMarginPercent =
    marginPercents.length === 0
      ? null
      : marginPercents.reduce((sum, m) => sum + m, 0) / marginPercents.length;

  return { totalItems, soldItems, sellThroughRate, avgMarginPercent };
}

export function computeDashboardStats(
  items: DashboardItem[],
  categories: { id: string; name: string }[]
): DashboardStats {
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

export function formatPercent(value: number | null): string {
  return value === null ? "N/A" : `${value.toFixed(1)}%`;
}
