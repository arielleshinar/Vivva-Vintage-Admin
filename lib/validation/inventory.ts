import { z } from "zod";

// Validation rules for everything on the inventory page: categories,
// items, and marking an item sold. Runs on the server (inside
// app/actions/inventory.ts) — never trust data from the browser.

/** A category just needs a non-empty name. */
export const categoryNameSchema = z.object({
  name: z.string().trim().min(1, "Category name is required"),
});

/**
 * Builds a validator for a money field (cost, price, sale price).
 *
 * Money fields arrive from the form as plain strings (that's how HTML
 * forms work), so this does three things in order: 1) make sure something
 * was typed at all, 2) make sure it's actually a number, 3) make sure it's
 * in range. `mode` controls that last check:
 *   - "nonnegative": zero is allowed (used for cost — an item can be free)
 *   - "positive": must be greater than zero (used for price/sale price —
 *     a $0 sale doesn't really make sense)
 *
 * `ctx.addIssue(...)` is how Zod reports a custom validation error, and
 * `z.NEVER` is a special marker meaning "this value is invalid, stop
 * here" — using .transform() instead of the more common .pipe(z.coerce...)
 * pattern sidesteps a type-checking quirk in this version of Zod.
 */
function moneyField(label: string, mode: "nonnegative" | "positive") {
  return z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .transform((value, ctx) => {
      const num = Number(value);
      if (Number.isNaN(num)) {
        ctx.addIssue(`${label} must be a number`);
        return z.NEVER;
      }
      if (mode === "nonnegative" ? num < 0 : num <= 0) {
        ctx.addIssue(
          mode === "nonnegative"
            ? `${label} must be zero or more`
            : `${label} must be greater than 0`
        );
        return z.NEVER;
      }
      return num;
    });
}

const costField = moneyField("Cost", "nonnegative");
const priceField = moneyField("Price", "positive");

/**
 * Rules for creating or editing an item. Note there's no rule saying
 * `cost` must be less than `price` — a "loss item" (priced below cost) is
 * allowed on purpose, it just gets visually flagged elsewhere in the UI.
 */
export const itemSchema = z.object({
  name: z.string().trim().min(1, "Item name is required"),
  cost: costField,
  price: priceField,
  // The category dropdown can be left on "No category" — an empty string
  // in that case gets turned into `null`, matching how the database
  // stores "no category" (rather than an empty-string category id, which
  // wouldn't match any real category and would just cause confusing bugs).
  categoryId: z
    .string()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
});

/** Rules for the "mark sold" form: which item, and what it actually sold for. */
export const markSoldSchema = z.object({
  itemId: z.string().trim().min(1, "Missing item id"),
  salePrice: priceField,
});
