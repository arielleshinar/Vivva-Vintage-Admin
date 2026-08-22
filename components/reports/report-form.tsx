"use client";

import { useActionState, useEffect, useRef } from "react";
import { exportReport, type ReportActionState } from "@/app/actions/reports";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";

const initialState: ReportActionState = {};

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function ReportForm() {
  const [state, formAction, pending] = useActionState(
    exportReport,
    initialState
  );
  const lastHandledStateRef = useRef<ReportActionState>(initialState);

  useEffect(() => {
    if (state === lastHandledStateRef.current) return;
    lastHandledStateRef.current = state;

    if (state.success && state.csv && state.filename) {
      downloadCsv(state.csv, state.filename);
    }
  }, [state]);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-xl border border-zinc-200 p-4 sm:flex-row sm:items-end sm:gap-3 dark:border-zinc-800"
    >
      <FormField
        label="Start date"
        name="startDate"
        type="date"
        required
        error={state.fieldErrors?.startDate?.[0]}
      />
      <FormField
        label="End date"
        name="endDate"
        type="date"
        required
        error={state.fieldErrors?.endDate?.[0]}
      />
      <Button type="submit" disabled={pending} className="sm:mb-0">
        {pending ? "Generating…" : "Export CSV"}
      </Button>
      {state.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}
    </form>
  );
}
