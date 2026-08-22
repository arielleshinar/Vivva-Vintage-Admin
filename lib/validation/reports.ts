import { z } from "zod";

const isoDateField = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date")
  .refine((value) => !Number.isNaN(Date.parse(value)), "Enter a valid date");

export const reportRangeSchema = z
  .object({
    startDate: isoDateField,
    endDate: isoDateField,
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "End date can't be before start date",
    path: ["endDate"],
  });
