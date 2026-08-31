import type { ReactNode } from "react";
import { Nav } from "@/components/ui/nav";

/**
 * Wraps every logged-in page (dashboard, inventory, receipts, reports)
 * with the shared Nav bar. The "(protected)" folder name is a Next.js
 * route group — the parentheses mean it's not part of the URL, so
 * /(protected)/dashboard still serves at /dashboard. This layout is purely
 * about shared chrome; the actual auth check still happens in proxy.ts
 * (and again per-page as a defensive fallback), not here.
 */
export default function ProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <Nav />
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
