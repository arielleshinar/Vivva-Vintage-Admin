import { describe, it, expect } from "vitest";
import { calculateMargin, computeDashboardStats, formatPercent } from "./stats";

describe("calculateMargin", () => {
  it("returns profit when price is above cost", () => {
    expect(calculateMargin(65, 20)).toBe(45);
  });

  it("returns a negative number for a loss item (cost above price)", () => {
    expect(calculateMargin(10, 30)).toBe(-20);
  });

  it("returns zero when price equals cost", () => {
    expect(calculateMargin(20, 20)).toBe(0);
  });

  it("handles a very large price/cost without overflowing or losing precision", () => {
    // Nothing realistic for a vintage shop, but the math itself shouldn't
    // break just because a number is big — e.g. from a typo like adding an
    // extra zero.
    expect(calculateMargin(9_999_999.99, 1_000_000)).toBeCloseTo(8_999_999.99, 2);
  });
});

describe("formatPercent", () => {
  it("shows N/A for null instead of 0% or NaN", () => {
    expect(formatPercent(null)).toBe("N/A");
  });

  it("formats a number to one decimal place with a % sign", () => {
    expect(formatPercent(69.2307)).toBe("69.2%");
  });
});

describe("computeDashboardStats", () => {
  it("doesn't crash and returns N/A stats for a business with zero items", () => {
    const stats = computeDashboardStats([], []);

    expect(stats.totalItems).toBe(0);
    expect(stats.soldItems).toBe(0);
    expect(stats.sellThroughRate).toBeNull();
    expect(stats.avgMarginPercent).toBeNull();
    expect(stats.categories).toEqual([]);
  });

  it("counts sell-through across all items, sold or not", () => {
    const stats = computeDashboardStats(
      [
        { categoryId: null, cost: 10, status: "sold", salePrice: 20 },
        { categoryId: null, cost: 10, status: "in_stock", salePrice: null },
      ],
      []
    );

    expect(stats.totalItems).toBe(2);
    expect(stats.soldItems).toBe(1);
    expect(stats.sellThroughRate).toBe(50);
  });

  it("excludes unsold items from the margin average, even if their listed price would be a loss", () => {
    // This is a direct regression test for a real bug: an unsold item
    // priced below cost used to drag the average margin down to a
    // misleading negative number, even though nothing had actually sold
    // at a loss yet.
    const stats = computeDashboardStats(
      [
        // Sold at a healthy profit.
        { categoryId: null, cost: 20, status: "sold", salePrice: 65 },
        // Still on the shelf, priced below cost — should NOT count.
        { categoryId: null, cost: 30, status: "in_stock", salePrice: null },
      ],
      []
    );

    // Only the one sold item should factor into the average: (65-20)/65*100.
    expect(stats.avgMarginPercent).toBeCloseTo(69.23, 1);
  });

  it("returns N/A margin for a category with items but no sales yet", () => {
    const stats = computeDashboardStats(
      [{ categoryId: null, cost: 30, status: "in_stock", salePrice: null }],
      []
    );

    expect(stats.avgMarginPercent).toBeNull();
  });

  it("computes correct margin % for a very large sale price", () => {
    const stats = computeDashboardStats(
      [{ categoryId: null, cost: 1_000_000, status: "sold", salePrice: 9_999_999.99 }],
      []
    );

    // (9,999,999.99 - 1,000,000) / 9,999,999.99 * 100
    expect(stats.avgMarginPercent).toBeCloseTo(90.0, 1);
  });

  it("groups items into their category, and an 'Uncategorized' bucket for the rest", () => {
    const stats = computeDashboardStats(
      [
        { categoryId: "cat-1", cost: 10, status: "sold", salePrice: 20 },
        { categoryId: null, cost: 5, status: "sold", salePrice: 15 },
      ],
      [{ id: "cat-1", name: "Dresses" }]
    );

    const categoryNames = stats.categories.map((c) => c.categoryName).sort();
    expect(categoryNames).toEqual(["Dresses", "Uncategorized"]);
  });

  it("leaves categories with zero items out of the breakdown entirely", () => {
    const stats = computeDashboardStats(
      [],
      [{ id: "cat-1", name: "Dresses" }]
    );

    expect(stats.categories).toEqual([]);
  });
});
