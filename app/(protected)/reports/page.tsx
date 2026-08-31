import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/supabase/get-business";
import { ReportForm } from "@/components/reports/report-form";

/**
 * The /reports page — the simplest page in the app. It doesn't fetch or
 * display any data of its own; it just confirms the visitor is logged in
 * and has a business, then renders the date-range form. All the actual
 * work (querying sales, building the CSV) happens in the ReportForm →
 * exportReport() Server Action, triggered when the form is submitted.
 */
export default async function ReportsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // proxy.ts already redirects unauthenticated requests before they reach
  // this page — this is a defensive fallback, not the primary auth boundary.
  if (!user) {
    redirect("/login");
  }

  const business = await getCurrentBusiness(supabase);

  if (!business) {
    return (
      <PageShell>
        <p className="text-sm text-red-600 dark:text-red-400">
          We couldn&apos;t find a business for your account. Please contact
          support.
        </p>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Select a date range to export a CSV of sold items for your
        accountant.
      </p>
      <div className="mt-6">
        <ReportForm />
      </div>
    </PageShell>
  );
}

/** Shared page wrapper — same idea as the other pages' PageShell, labeled "Reports". */
function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex-1 bg-zinc-50 px-4 py-12 dark:bg-black">
      <div className="mx-auto w-full max-w-4xl">
        <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Reports
        </h1>
        {children}
      </div>
    </div>
  );
}
