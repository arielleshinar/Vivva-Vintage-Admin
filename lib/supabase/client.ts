import { createBrowserClient } from "@supabase/ssr";

// This file is for Client Components — code that runs in the visitor's
// browser, not on the server. Right now nothing in the app actually calls
// this (all our Supabase reads/writes happen server-side, in Server
// Components and Server Actions), but it's kept here as the standard place
// to create a browser-side Supabase client if a future feature needs one
// (e.g. a live/real-time subscription).

/**
 * Creates a Supabase client meant to run in the browser. Uses the public
 * anon key, which is safe to expose to visitors — Row Level Security on
 * the database is what actually keeps everyone's data separate, not this
 * key being secret.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
