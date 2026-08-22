"use client";

import { useActionState } from "react";
import { createItem, type InventoryActionState } from "@/app/actions/inventory";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { SelectField } from "@/components/ui/select-field";

const initialState: InventoryActionState = {};

interface AddItemFormProps {
  categories: { id: string; name: string }[];
}

export function AddItemForm({ categories }: AddItemFormProps) {
  const [state, formAction, pending] = useActionState(
    createItem,
    initialState
  );

  return (
    <form
      action={formAction}
      className="grid grid-cols-1 gap-3 rounded-xl border border-zinc-200 p-4 sm:grid-cols-5 sm:items-end dark:border-zinc-800"
    >
      <div className="sm:col-span-2">
        <FormField
          label="Item name"
          name="name"
          type="text"
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
        required
        error={state.fieldErrors?.price?.[0]}
      />
      <SelectField
        label="Category"
        name="categoryId"
        defaultValue=""
        error={state.fieldErrors?.categoryId?.[0]}
      >
        <option value="">No category</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </SelectField>
      <Button type="submit" disabled={pending} className="sm:col-span-5">
        {pending ? "Adding…" : "Add item"}
      </Button>
      {state.error && (
        <p
          role="alert"
          className="text-sm text-red-600 dark:text-red-400 sm:col-span-5"
        >
          {state.error}
        </p>
      )}
    </form>
  );
}
