import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// This is the Supabase client used almost everywhere in the app: inside
// Server Components (page.tsx files) and Server Actions (app/actions/*.ts).
// It reads the visitor's login cookies so every database query it makes is
// automatically scoped to that logged-in user (combined with Row Level
// Security policies on the database side).

/**
 * Creates a Supabase client for use on the server, wired up to read and
 * write the current request's cookies (that's how it knows who's logged
 * in). Must be called fresh on every request — don't cache the result.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Next.js only allows writing cookies from a Server Action or
            // Route Handler, not from a plain Server Component render.
            // If we're in that situation, this throws — which is fine to
            // ignore here, because proxy.ts (lib/supabase/proxy.ts) already
            // handles refreshing the session cookie for every request.
          }
        },
      },
    }
  );
}
