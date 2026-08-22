import type { ButtonHTMLAttributes } from "react";

export const buttonStyles =
  "flex h-11 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-medium text-zinc-50 transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200";

export function Button({
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`${buttonStyles} ${className}`} {...props} />;
}
