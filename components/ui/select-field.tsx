"use client";

import { useId, type SelectHTMLAttributes } from "react";

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  name: string;
  error?: string;
}

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
