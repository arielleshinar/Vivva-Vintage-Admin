"use client";

import { useActionState, useEffect, useState } from "react";
import {
  deleteItem,
  markItemSold,
  updateItem,
  type InventoryActionState,
} from "@/app/actions/inventory";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { SelectField } from "@/components/ui/select-field";
import type { ItemStatus } from "@/lib/types/database";

const initialState: InventoryActionState = {};

export interface ItemRowItem {
  id: string;
  name: string;
  cost: number;
  price: number;
  status: ItemStatus;
  categoryId: string | null;
  categoryName: string | null;
}

interface ItemRowProps {
  item: ItemRowItem;
  categories: { id: string; name: string }[];
}

export function ItemRow({ item, categories }: ItemRowProps) {
  const [mode, setMode] = useState<"view" | "edit" | "sell">("view");

  if (mode === "edit") {
    return (
      <EditItemForm
        item={item}
        categories={categories}
        onDone={() => setMode("view")}
      />
    );
  }

  if (mode === "sell") {
    return <SellItemForm item={item} onDone={() => setMode("view")} />;
  }

  return (
    <ViewItemRow
      item={item}
      onEdit={() => setMode("edit")}
      onSell={() => setMode("sell")}
    />
  );
}

function ViewItemRow({
  item,
  onEdit,
  onSell,
}: {
  item: ItemRowItem;
  onEdit: () => void;
  onSell: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    deleteItem,
    initialState
  );
  const margin = item.price - item.cost;
  const isLoss = margin < 0;

  return (
    <tr>
      <td className="px-4 py-3 text-zinc-950 dark:text-zinc-50">
        {item.name}
      </td>
      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
        {item.categoryName ?? "—"}
      </td>
      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
        ${item.cost.toFixed(2)}
      </td>
      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
        ${item.price.toFixed(2)}
      </td>
      <td className="px-4 py-3">
        <span
          className={
            isLoss
              ? "text-red-600 dark:text-red-400"
              : "text-zinc-600 dark:text-zinc-400"
          }
        >
          {isLoss ? "Loss " : ""}${margin.toFixed(2)}
        </span>
      </td>
      <td className="px-4 py-3">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            item.status === "sold"
              ? "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
          }`}
        >
          {item.status === "sold" ? "Sold" : "In stock"}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-2">
          {item.status === "in_stock" && (
            <button
              type="button"
              onClick={onSell}
              className="text-sm font-medium text-zinc-950 underline dark:text-zinc-50"
            >
              Mark sold
            </button>
          )}
          <button
            type="button"
            onClick={onEdit}
            className="text-sm font-medium text-zinc-950 underline dark:text-zinc-50"
          >
            Edit
          </button>
          <form
            action={formAction}
            onSubmit={(event) => {
              if (!confirm(`Delete "${item.name}"? This can't be undone.`)) {
                event.preventDefault();
              }
            }}
          >
            <input type="hidden" name="id" value={item.id} />
            <button
              type="submit"
              disabled={pending}
              className="text-sm font-medium text-red-600 underline disabled:opacity-50 dark:text-red-400"
            >
              Delete
            </button>
          </form>
        </div>
        {state.error && (
          <p role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">
            {state.error}
          </p>
        )}
      </td>
    </tr>
  );
}

function EditItemForm({
  item,
  categories,
  onDone,
}: {
  item: ItemRowItem;
  categories: { id: string; name: string }[];
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    updateItem,
    initialState
  );

  useEffect(() => {
    if (state.success) onDone();
  }, [state.success, onDone]);

  return (
    <tr>
      <td colSpan={7} className="px-4 py-3">
        <form
          action={formAction}
          className="grid grid-cols-1 gap-3 sm:grid-cols-5 sm:items-end"
        >
          <input type="hidden" name="id" value={item.id} />
          <div className="sm:col-span-2">
            <FormField
              label="Item name"
              name="name"
              type="text"
              defaultValue={item.name}
              required
              error={state.fieldErrors?.name?.[0]}
            />
          </div>
          <FormField
            label="Cost"
            name="cost"
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            defaultValue={item.cost}
            required
            error={state.fieldErrors?.cost?.[0]}
          />
          <FormField
            label="Price"
            name="price"
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            defaultValue={item.price}
            required
            error={state.fieldErrors?.price?.[0]}
          />
          <SelectField
            label="Category"
            name="categoryId"
            defaultValue={item.categoryId ?? ""}
            error={state.fieldErrors?.categoryId?.[0]}
          >
            <option value="">No category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </SelectField>
          <div className="flex gap-3 sm:col-span-5">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
            <button
              type="button"
              onClick={onDone}
              className="text-sm font-medium text-zinc-600 underline dark:text-zinc-400"
            >
              Cancel
            </button>
          </div>
          {state.error && (
            <p
              role="alert"
              className="text-sm text-red-600 dark:text-red-400 sm:col-span-5"
            >
              {state.error}
            </p>
          )}
        </form>
      </td>
    </tr>
  );
}

function SellItemForm({
  item,
  onDone,
}: {
  item: ItemRowItem;
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    markItemSold,
    initialState
  );

  useEffect(() => {
    if (state.success) onDone();
  }, [state.success, onDone]);

  return (
    <tr>
      <td colSpan={7} className="px-4 py-3">
        <form action={formAction} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="itemId" value={item.id} />
          <p className="text-sm text-zinc-800 dark:text-zinc-200">
            Mark <span className="font-medium">{item.name}</span> as sold for
          </p>
          <FormField
            label="Sale price"
            name="salePrice"
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            defaultValue={item.price}
            required
            error={state.fieldErrors?.salePrice?.[0]}
          />
          <Button type="submit" disabled={pending}>
            {pending ? "Confirming…" : "Confirm sale"}
          </Button>
          <button
            type="button"
            onClick={onDone}
            className="text-sm font-medium text-zinc-600 underline dark:text-zinc-400"
          >
            Cancel
          </button>
          {state.error && (
            <p role="alert" className="w-full text-sm text-red-600 dark:text-red-400">
              {state.error}
            </p>
          )}
        </form>
      </td>
    </tr>
  );
}
