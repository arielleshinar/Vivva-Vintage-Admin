"use client";

import { useId, type InputHTMLAttributes } from "react";

// A labeled text input with a built-in space for a validation error message
// underneath. Used by every form in the app (signup, login, add item, edit
// item, dates on the reports page, etc.) so they all look and behave the
// same way.

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  name: string;
  error?: string;
}

/**
 * Renders a <label> + <input> pair, plus the error text below it when
 * `error` is set.
 *
 * Uses React's `useId()` to generate the input's `id` instead of reusing
 * the `name` prop directly. This matters because the same field `name`
 * (like "name" or "cost") can appear more than once on a page at the same
 * time — e.g. the "add item" form and an "edit item" row both have a field
 * called "name". If we used `name` as the DOM `id` too, both inputs would
 * share one id, which is invalid HTML and breaks the label's click-to-focus
 * behavior. `useId()` guarantees every instance of this component gets its
 * own unique id, no matter how many are on the page at once.
 */
export function FormField({
  label,
  name,
  error,
  className = "",
  ...props
}: FormFieldProps) {
  const id = useId();

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-sm font-medium text-zinc-800 dark:text-zinc-200"
      >
        {label}
      </label>
      <input
        id={id}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`h-11 rounded-lg border bg-white px-3 text-sm text-zinc-950 outline-none focus:ring-2 focus:ring-zinc-950/20 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:ring-zinc-50/20 ${
          error ? "border-red-500" : "border-zinc-300 dark:border-zinc-700"
        } ${className}`}
        {...props}
      />
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
