import { calculateMargin } from "@/lib/dashboard/stats";

// Turns a list of sold items into an actual CSV (spreadsheet) file, as
// plain text. Kept separate from app/actions/reports.ts so this part —
// "given some rows, produce valid CSV text" — has nothing to do with
// Supabase or forms, and could be tested completely on its own.

/** One row of the report: everything needed to describe a single sale. */
export interface ReportRow {
  soldAt: string;
  itemName: string;
  categoryName: string | null;
  salePrice: number;
  cost: number;
}

/**
 * CSV has two characters that need special handling: a comma would be
 * mistaken for a column separator, and a quote needs to be doubled up.
 * If a value contains either of those (or a line break), this wraps it in
 * quotes and escapes any quotes inside it — e.g. `Sam's Shop` (has an
 * apostrophe, fine as-is) vs `Sam, Inc.` (has a comma, becomes `"Sam,
 * Inc."`).
 */
function escapeCsvField(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/**
 * Builds the full CSV file as one string: a header row, then one row per
 * sale. If `rows` is empty, this still returns a valid file — just the
 * header line with nothing underneath — rather than throwing or returning
 * something broken. That's what makes a zero-sales date range download a
 * normal (if boring) spreadsheet instead of erroring.
 */
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
