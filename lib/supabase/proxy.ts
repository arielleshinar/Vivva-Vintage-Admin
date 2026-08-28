import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Routes that don't require the visitor to be logged in. Every other route
// in the app is treated as "protected" by default.
const publicRoutes = ["/login", "/signup"];

/**
 * Runs on (almost) every request, before any page renders. It does three
 * things, in order:
 *
 *   1. Refreshes the visitor's Supabase login session (their access token
 *      expires periodically, so this quietly renews it and re-saves the
 *      updated cookies on the response — without this step, users would
 *      randomly get logged out).
 *   2. If they're NOT logged in and trying to reach a protected page,
 *      sends them to /login instead.
 *   3. If they ARE logged in and trying to reach /login or /signup, sends
 *      them to /dashboard instead (no reason to show a logged-in user the
 *      login form).
 */
export async function updateSession(request: NextRequest) {
  // This starts as a plain "continue as normal" response. If Supabase needs
  // to write refreshed cookies (step 1 below), we replace it with a new one
  // that carries those cookies — see setAll().
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        // Supabase calls this whenever it needs to update the session
        // cookies (e.g. after refreshing an expired token). We write the
        // new cookies onto both the incoming request (so the rest of this
        // function sees them) and a fresh response (so the browser saves
        // them too).
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refreshes the session and syncs cookies — do not add logic between
  // client creation and this call, it needs to run on every request.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublicRoute = publicRoutes.some((route) => path.startsWith(route));

  // Not logged in, trying to reach a protected page (e.g. /dashboard) —
  // bounce to the login screen.
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Already logged in, trying to reach /login or /signup — send them
  // straight to the dashboard instead.
  if (user && isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Otherwise, let the request through as normal (with refreshed
  // cookies attached, if step 1 updated any).
  return supabaseResponse;
}
