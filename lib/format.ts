// Shared display formatting used across inventory and receipts — kept in
// one place so every money value in the app (cost, price, margin, sale
// price) renders the same way, including thousands separators for large
// values (e.g. "₪9,999,999.99", not "₪9999999.99").
//
// Currency is NIS (Israeli new shekel) — this app is built for the RUNI
// course, not a real US business, so the numbers should read as shekels.
// The locale stays "en-US" (not "he-IL") since the rest of the app's copy
// is in English — that only affects digit grouping/decimal punctuation,
// not the currency symbol, which comes from the `currency: "ILS"` code.

/** Formats a number as NIS, e.g. formatMoney(1234.5) -> "₪1,234.50". */
export function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "ILS",
  }).format(value);
}
