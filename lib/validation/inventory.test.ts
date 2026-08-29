import { describe, it, expect } from "vitest";
import { categoryNameSchema, itemSchema, markSoldSchema } from "./inventory";

describe("categoryNameSchema", () => {
  it("accepts a normal name", () => {
    expect(categoryNameSchema.safeParse({ name: "Dresses" }).success).toBe(true);
  });

  it("rejects an empty name", () => {
    expect(categoryNameSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("rejects a whitespace-only name", () => {
    expect(categoryNameSchema.safeParse({ name: "   " }).success).toBe(false);
  });
});

describe("itemSchema", () => {
  const validItem = { name: "Jacket", cost: "20", price: "65", categoryId: "" };

  it("accepts a fully valid item", () => {
    const result = itemSchema.safeParse(validItem);
    expect(result.success).toBe(true);
  });

  it("rejects a missing name", () => {
    const result = itemSchema.safeParse({ ...validItem, name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a negative cost", () => {
    const result = itemSchema.safeParse({ ...validItem, cost: "-5" });
    expect(result.success).toBe(false);
  });

  it("allows a cost of exactly zero (a free/donated item)", () => {
    const result = itemSchema.safeParse({ ...validItem, cost: "0" });
    expect(result.success).toBe(true);
  });

  it("rejects a price of zero — unlike cost, price must be greater than zero", () => {
    const result = itemSchema.safeParse({ ...validItem, price: "0" });
    expect(result.success).toBe(false);
  });

  it("rejects a negative price", () => {
    const result = itemSchema.safeParse({ ...validItem, price: "-10" });
    expect(result.success).toBe(false);
  });

  it("rejects non-numeric text in cost", () => {
    const result = itemSchema.safeParse({ ...validItem, cost: "abc" });
    expect(result.success).toBe(false);
  });

  it("allows cost to be greater than price — a loss item is a valid, if flagged, state", () => {
    const result = itemSchema.safeParse({ ...validItem, cost: "30", price: "10" });
    expect(result.success).toBe(true);
  });

  it("accepts a very large price/cost instead of rejecting it as out of range", () => {
    const result = itemSchema.safeParse({ ...validItem, cost: "1000000", price: "9999999.99" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.price).toBe(9999999.99);
    }
  });

  it("turns an empty categoryId into null (no category), not an empty string", () => {
    const result = itemSchema.safeParse({ ...validItem, categoryId: "" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.categoryId).toBeNull();
    }
  });

  it("keeps a real categoryId as-is", () => {
    const result = itemSchema.safeParse({ ...validItem, categoryId: "cat-123" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.categoryId).toBe("cat-123");
    }
  });
});

describe("markSoldSchema", () => {
  it("accepts a valid sale", () => {
    const result = markSoldSchema.safeParse({ itemId: "item-1", salePrice: "65" });
    expect(result.success).toBe(true);
  });

  it("rejects a sale price of zero", () => {
    const result = markSoldSchema.safeParse({ itemId: "item-1", salePrice: "0" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing item id", () => {
    const result = markSoldSchema.safeParse({ itemId: "", salePrice: "65" });
    expect(result.success).toBe(false);
  });
});
