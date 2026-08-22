"use client";

import { useActionState } from "react";
import {
  createCategory,
  deleteCategory,
  type InventoryActionState,
} from "@/app/actions/inventory";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";

const initialState: InventoryActionState = {};

interface CategoryManagerProps {
  categories: { id: string; name: string }[];
}

export function CategoryManager({ categories }: CategoryManagerProps) {
  const [state, formAction, pending] = useActionState(
    createCategory,
    initialState
  );

  return (
    <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
        Categories
      </h2>

      <ul className="mt-3 flex flex-wrap gap-2">
        {categories.length === 0 && (
          <li className="text-sm text-zinc-500 dark:text-zinc-400">
            No categories yet.
          </li>
        )}
        {categories.map((category) => (
          <CategoryChip key={category.id} id={category.id} name={category.name} />
        ))}
      </ul>

      <form action={formAction} className="mt-4 flex items-end gap-2">
        <div className="flex-1">
          <FormField
            label="New category"
            name="name"
            type="text"
            required
            error={state.fieldErrors?.name?.[0]}
          />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add"}
        </Button>
      </form>
      {state.error && (
        <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}
    </div>
  );
}

function CategoryChip({ id, name }: { id: string; name: string }) {
  const [state, formAction, pending] = useActionState(
    deleteCategory,
    initialState
  );

  return (
    <li className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 rounded-full border border-zinc-300 py-1 pl-3 pr-1.5 text-sm text-zinc-800 dark:border-zinc-700 dark:text-zinc-200">
        {name}
        <form
          action={formAction}
          onSubmit={(event) => {
            if (
              !confirm(
                `Delete category "${name}"? Items in this category will become uncategorized.`
              )
            ) {
              event.preventDefault();
            }
          }}
        >
          <input type="hidden" name="id" value={id} />
          <button
            type="submit"
            disabled={pending}
            aria-label={`Delete ${name}`}
            className="rounded-full px-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-50 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            ×
          </button>
        </form>
      </div>
      {state.error && (
        <span role="alert" className="text-xs text-red-600 dark:text-red-400">
          {state.error}
        </span>
      )}
    </li>
  );
}
