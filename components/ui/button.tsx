import type { ButtonHTMLAttributes } from "react";

// The one button style used across the whole app (signup, login, every
// "Add"/"Save"/"Delete" action). Keeping the styling in one place means
// changing how buttons look means editing exactly one file.

/**
 * Shared Tailwind classes for a button, exported separately so other
 * components (like the empty-state "Add your first item" link) can reuse
 * the exact same look on a non-<button> element, e.g. a <Link>.
 */
export const buttonStyles =
  "flex h-11 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-medium text-zinc-50 transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200";

/**
 * A standard button. Accepts every normal <button> prop (onClick, type,
 * disabled, etc.) plus an optional extra `className` to tweak one-off
 * cases without duplicating the whole style string.
 */
export function Button({
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`${buttonStyles} ${className}`} {...props} />;
}
