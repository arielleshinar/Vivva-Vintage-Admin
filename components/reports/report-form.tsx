"use client";

import { useActionState, useEffect, useRef } from "react";
import { exportReport, type ReportActionState } from "@/app/actions/reports";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";

const initialState: ReportActionState = {};

/**
 * Takes the finished CSV text and actually saves it to the visitor's
 * computer. There's no server endpoint involved in this step — a "Blob"
 * is just the file's contents held in browser memory, `URL.createObjectURL`
 * gives it a temporary local address, and clicking an invisible <a
 * download> link is the standard trick for triggering a save-file dialog
 * from JavaScript. We clean up both the link element and the temporary
 * URL right after, since neither is needed once the download has started.
 */
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

/**
 * The date-range form on the reports page. Same `useActionState` pattern
 * as every other form in the app, but with one extra piece: since a
 * Server Action can only *return* data (it can't directly tell the
 * browser to download a file), this component watches the returned state
 * for a successful CSV and triggers the download itself.
 *
 * `lastHandledStateRef` exists to make sure we only download once per
 * submission. `useActionState` gives us a brand-new `state` object every
 * time the action finishes (even if you submit the exact same dates
 * twice in a row), so comparing "is this the same state object we already
 * handled?" correctly triggers a fresh download each time, without ever
 * double-downloading the same result from an unrelated re-render.
 */
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
