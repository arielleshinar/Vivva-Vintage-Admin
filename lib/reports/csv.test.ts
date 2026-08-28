import { describe, it, expect } from "vitest";
import { buildReportCsv } from "./csv";

describe("buildReportCsv", () => {
  it("returns a valid file with just the header row when there are no sales", () => {
    // This is the "zero-sales date range" edge case from the test plan —
    // it must produce a valid, downloadable (if boring) file, not an error.
    const csv = buildReportCsv([]);

    expect(csv).toBe("Date Sold,Item,Category,Sale Price,Cost,Margin\n");
  });

  it("formats a normal row with money values to two decimal places", () => {
    const csv = buildReportCsv([
      {
        soldAt: "2026-08-22T14:13:00.000Z",
        itemName: "Vintage Denim Jacket",
        categoryName: "Dresses",
        salePrice: 65,
        cost: 20,
      },
    ]);

    const lines = csv.trim().split("\n");
    expect(lines[1]).toBe("2026-08-22,Vintage Denim Jacket,Dresses,65.00,20.00,45.00");
  });

  it("labels an item with no category as 'Uncategorized'", () => {
    const csv = buildReportCsv([
      {
        soldAt: "2026-08-22T14:13:00.000Z",
        itemName: "Scarf",
        categoryName: null,
        salePrice: 10,
        cost: 30,
      },
    ]);

    expect(csv).toContain("Scarf,Uncategorized,10.00,30.00,-20.00");
  });

  it("wraps an item name containing a comma in quotes so it doesn't break the columns", () => {
    const csv = buildReportCsv([
      {
        soldAt: "2026-08-22T14:13:00.000Z",
        itemName: "Coat, Wool",
        categoryName: null,
        salePrice: 50,
        cost: 25,
      },
    ]);

    expect(csv).toContain('"Coat, Wool"');
  });

  it("doubles up any quote characters inside a quoted field", () => {
    const csv = buildReportCsv([
      {
        soldAt: "2026-08-22T14:13:00.000Z",
        itemName: 'The "Good" Jacket',
        categoryName: null,
        salePrice: 50,
        cost: 25,
      },
    ]);

    expect(csv).toContain('"The ""Good"" Jacket"');
  });
});
