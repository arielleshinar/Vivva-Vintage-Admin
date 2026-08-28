import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// This file runs on the server before almost every request, for every
// route in the app. Its only job here is to hand off to updateSession(),
// which does the real work of checking whether the visitor is logged in
// and redirecting them if they're somewhere they shouldn't be.
//
// Next.js 16 renamed the old `middleware.ts` convention to `proxy.ts` — same
// behavior, new file/export name. See node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md

/**
 * The entry point Next.js calls automatically on every matched request
 * (see `config.matcher` below). It just delegates to updateSession().
 */
export function proxy(request: NextRequest) {
  return updateSession(request);
}

/**
 * Tells Next.js which routes should run `proxy()` above. This pattern means
 * "run on every route EXCEPT static assets" (Next's own build files, the
 * favicon, and common image extensions) — those never need a login check.
 */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
