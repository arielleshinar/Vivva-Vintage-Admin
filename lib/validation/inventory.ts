import { z } from "zod";

export const categoryNameSchema = z.object({
  name: z.string().trim().min(1, "Category name is required"),
});

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

export const itemSchema = z.object({
  name: z.string().trim().min(1, "Item name is required"),
  cost: costField,
  price: priceField,
  categoryId: z
    .string()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
});

export const markSoldSchema = z.object({
  itemId: z.string().trim().min(1, "Missing item id"),
  salePrice: priceField,
});
