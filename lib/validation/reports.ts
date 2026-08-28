import { z } from "zod";

// Validation for the reports page's date-range form.

/** A single date field: must look like "2026-08-22" and actually be a real, parseable date (rules out something like "2026-13-45"). */
const isoDateField = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date")
  .refine((value) => !Number.isNaN(Date.parse(value)), "Enter a valid date");

/**
 * The full date-range check: both dates individually valid, AND the end
 * date isn't before the start date. That second rule is a
 * "cross-field" check — it needs both values at once, so it's attached to
 * the whole object with `.refine()` rather than to a single field. The
 * `path: ["endDate"]` part tells Zod to show the resulting error message
 * under the end-date field specifically.
 */
export const reportRangeSchema = z
  .object({
    startDate: isoDateField,
    endDate: isoDateField,
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "End date can't be before start date",
    path: ["endDate"],
  });
