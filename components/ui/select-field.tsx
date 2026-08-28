"use client";

import { useId, type SelectHTMLAttributes } from "react";

// The dropdown-menu equivalent of FormField (components/ui/form-field.tsx).
// Same labeled-field-with-error look, just wrapping a <select> instead of
// an <input>. Used for the category picker on the add/edit item forms.

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  name: string;
  error?: string;
}

/**
 * Renders a <label> + <select> pair, plus an error message below it.
 * Pass the <option> elements as children, same as a plain <select>.
 *
 * Uses `useId()` for the same reason FormField does — so multiple
 * dropdowns with the same `name` (e.g. "categoryId" in both the add-item
 * form and an item's edit row) never collide on the same DOM id.
 */
export function SelectField({
  label,
  name,
  error,
  className = "",
  children,
  ...props
}: SelectFieldProps) {
  const id = useId();

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-sm font-medium text-zinc-800 dark:text-zinc-200"
      >
        {label}
      </label>
      <select
        id={id}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`h-11 rounded-lg border bg-white px-3 text-sm text-zinc-950 outline-none focus:ring-2 focus:ring-zinc-950/20 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:ring-zinc-50/20 ${
          error ? "border-red-500" : "border-zinc-300 dark:border-zinc-700"
        } ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && (
        <p
          id={`${id}-error`}
          className="text-sm text-red-600 dark:text-red-400"
        >
          {error}
        </p>
      )}
    </div>
  );
}
