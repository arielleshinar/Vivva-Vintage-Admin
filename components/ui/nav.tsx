import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/supabase/get-business";
import { signOut } from "@/app/actions/auth";
import { NavLinks } from "./nav-links";

/**
 * The persistent top bar shown on every logged-in page (wired up in
 * app/(protected)/layout.tsx) — the wordmark, links to the four main
 * pages, the current business's name, and a logout button. Before this
 * existed, moving between pages meant hand-editing the URL and there was
 * no way to log out at all.
 *
 * A Server Component: it fetches the business name itself rather than
 * having every page pass it down, since proxy.ts already guarantees this
 * only renders for a logged-in request.
 */
export async function Nav() {
  const supabase = await createClient();
  const business = await getCurrentBusiness(supabase);

  return (
    <header className="border-b border-zinc-200 bg-white print:hidden dark:border-zinc-800 dark:bg-black">
      <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-6">
          <span className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
            Vivva Admin
          </span>
          <NavLinks />
        </div>
        <div className="flex items-center gap-4">
          {business && (
            <span className="hidden text-sm text-zinc-500 sm:inline dark:text-zinc-400">
              {business.name}
            </span>
          )}
          <form action={signOut}>
            <button
              type="submit"
              className="text-sm text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              Log out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
