import { describe, it, expect } from "vitest";
import { reportRangeSchema } from "./reports";

describe("reportRangeSchema", () => {
  it("accepts a normal range where the start date is before the end date", () => {
    const result = reportRangeSchema.safeParse({
      startDate: "2026-08-01",
      endDate: "2026-08-22",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a single-day range (start and end on the same date)", () => {
    const result = reportRangeSchema.safeParse({
      startDate: "2026-08-22",
      endDate: "2026-08-22",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a reversed range where the end date is before the start date", () => {
    const result = reportRangeSchema.safeParse({
      startDate: "2026-08-22",
      endDate: "2026-08-01",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      // The error should be attached to endDate specifically, so the UI
      // can show it right next to that field.
      expect(result.error.flatten().fieldErrors.endDate).toBeDefined();
    }
  });

  it("rejects a malformed date string", () => {
    const result = reportRangeSchema.safeParse({
      startDate: "not-a-date",
      endDate: "2026-08-22",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a date that isn't a real calendar day", () => {
    const result = reportRangeSchema.safeParse({
      startDate: "2026-13-45",
      endDate: "2026-08-22",
    });
    expect(result.success).toBe(false);
  });
});
