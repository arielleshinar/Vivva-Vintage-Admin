"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/inventory", label: "Inventory" },
  { href: "/receipts", label: "Receipts" },
  { href: "/reports", label: "Reports" },
] as const;

/**
 * The nav's page links, split out from Nav as its own small Client
 * Component — it's the only part of the nav that needs to know the
 * current URL (via usePathname, a client-only hook) to highlight the
 * active page. Everything else about the nav (the business name, the
 * logout form) stays a plain Server Component.
 */
export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-5 text-sm">
      {links.map((link) => {
        // /receipts/[id] should still highlight "Receipts" as active.
        const isActive =
          pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={
              isActive
                ? "font-medium text-zinc-950 dark:text-zinc-50"
                : "text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
            }
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
