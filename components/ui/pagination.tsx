import Link from "next/link";

interface PaginationProps {
  /** The page's own path, e.g. "/inventory" — used to build the ?page= links. */
  basePath: string;
  page: number;
  totalPages: number;
}

/**
 * A plain "Page X of Y" row with Previous/Next links. This is a Server
 * Component (no "use client", no state) — the current page is just
 * whatever ?page= is in the URL, so moving between pages is a normal
 * navigation, not client-side interactivity. Renders nothing at all when
 * there's only one page, so it doesn't clutter a short list.
 */
export function Pagination({ basePath, page, totalPages }: PaginationProps) {
  if (totalPages <= 1) return null;

  const linkClass =
    "text-sm font-medium text-zinc-950 underline dark:text-zinc-50";
  const disabledClass =
    "text-sm font-medium text-zinc-400 dark:text-zinc-600";

  return (
    <div className="mt-4 flex items-center justify-between">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Page {page} of {totalPages}
      </p>
      <div className="flex gap-4">
        {page > 1 ? (
          <Link href={`${basePath}?page=${page - 1}`} className={linkClass}>
            Previous
          </Link>
        ) : (
          <span className={disabledClass}>Previous</span>
        )}
        {page < totalPages ? (
          <Link href={`${basePath}?page=${page + 1}`} className={linkClass}>
            Next
          </Link>
        ) : (
          <span className={disabledClass}>Next</span>
        )}
      </div>
    </div>
  );
}
