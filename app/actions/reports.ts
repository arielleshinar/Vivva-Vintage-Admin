"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/supabase/get-business";
import { reportRangeSchema } from "@/lib/validation/reports";
import { buildReportCsv } from "@/lib/reports/csv";
import { getSoldItemsInRange } from "@/lib/reports/query";

/**
 * Same general shape as the other actions' state types, plus two extra
 * fields specific to this one: `csv` (the finished file's text) and
 * `filename` (what to name the download). The form component
 * (components/reports/report-form.tsx) watches for those two fields to
 * know when to trigger the actual browser download.
 */
export type ReportActionState = {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  csv?: string;
  filename?: string;
};

const GENERIC_ERROR: ReportActionState = {
  error: "Couldn't generate the report. Please try again.",
};

/**
 * Builds and returns a CSV export of everything sold in a given date
 * range. Steps: validate the two dates → find this business → fetch the
 * sold items in range via getSoldItemsInRange() → hand them to
 * buildReportCsv(). The actual data-gathering logic lives in
 * lib/reports/query.ts, kept separate so it's testable on its own.
 */
export async function exportReport(
  _prevState: ReportActionState,
  formData: FormData
): Promise<ReportActionState> {
  const parsed = reportRangeSchema.safeParse({
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { startDate, endDate } = parsed.data;

  const supabase = await createClient();
  const business = await getCurrentBusiness(supabase);
  if (!business) {
    return { error: "Could not find your business. Please contact support." };
  }

  const filename = `report-${startDate}-to-${endDate}.csv`;
  // The date inputs only give us a day (e.g. "2026-08-22"), so we expand
  // that into a full day's worth of time — midnight at the very start of
  // the start date, through one millisecond before midnight on the day
  // after the end date — so "sold on the end date" actually gets included.
  const rangeStart = `${startDate}T00:00:00.000Z`;
  const rangeEnd = `${endDate}T23:59:59.999Z`;

  let rows;
  try {
    rows = await getSoldItemsInRange(supabase, business.id, rangeStart, rangeEnd);
  } catch {
    return GENERIC_ERROR;
  }

  return { success: true, csv: buildReportCsv(rows), filename };
}
