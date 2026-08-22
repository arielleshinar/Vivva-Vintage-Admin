import { calculateMargin } from "@/lib/dashboard/stats";

export interface ReportRow {
  soldAt: string;
  itemName: string;
  categoryName: string | null;
  salePrice: number;
  cost: number;
}

function escapeCsvField(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function buildReportCsv(rows: ReportRow[]): string {
  const header = ["Date Sold", "Item", "Category", "Sale Price", "Cost", "Margin"];
  const lines = [header.join(",")];

  for (const row of rows) {
    const margin = calculateMargin(row.salePrice, row.cost);
    lines.push(
      [
        escapeCsvField(row.soldAt.slice(0, 10)),
        escapeCsvField(row.itemName),
        escapeCsvField(row.categoryName ?? "Uncategorized"),
        row.salePrice.toFixed(2),
        row.cost.toFixed(2),
        margin.toFixed(2),
      ].join(",")
    );
  }

  return lines.join("\n") + "\n";
}
