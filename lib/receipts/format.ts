/**
 * Turns the raw timestamp Supabase gives us (an ISO string like
 * "2026-08-22T14:13:00.000Z") into something readable, e.g.
 * "Aug 22, 2026, 2:13 PM". Used on both the receipts list and the
 * individual printable receipt, so the date always looks the same
 * everywhere in the app.
 */
export function formatReceiptDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
