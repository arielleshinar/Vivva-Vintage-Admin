export function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-300 px-6 py-12 text-center dark:border-zinc-700">
      <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
        No inventory yet
      </h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Add your first item using the form above to get started.
      </p>
    </div>
  );
}
