import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/supabase/get-business";
import { ReportForm } from "@/components/reports/report-form";

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
    <PageShell businessName={business.name}>
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

function PageShell({
  businessName,
  children,
}: {
  businessName?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex-1 bg-zinc-50 px-4 py-12 dark:bg-black">
      <div className="mx-auto w-full max-w-4xl">
        <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Reports
        </h1>
        {businessName && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {businessName}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}
