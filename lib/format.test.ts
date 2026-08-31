import { describe, it, expect } from "vitest";
import { formatMoney } from "./format";

describe("formatMoney", () => {
  it("formats a normal value with two decimal places", () => {
    expect(formatMoney(65)).toBe("₪65.00");
  });

  it("adds thousands separators for large values", () => {
    expect(formatMoney(9999999.99)).toBe("₪9,999,999.99");
  });

  it("formats zero", () => {
    expect(formatMoney(0)).toBe("₪0.00");
  });

  it("formats a negative value with the sign before the currency symbol", () => {
    expect(formatMoney(-20)).toBe("-₪20.00");
  });
});
