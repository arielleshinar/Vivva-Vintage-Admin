import { createClient } from "@supabase/supabase-js";

// Shared by every integration test file that needs a real, signed-in
// Supabase client — right now that's tests/rls.test.ts and
// tests/db-constraints.test.ts. Both need "a real account with a real
// business" as their starting point; this is that starting point.

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export interface TestAccount {
  email: string;
  password: string;
  businessName: string;
}

/**
 * Signs a test user in, creating both the auth account and its business
 * the first time this ever runs, and just signing in on every run after —
 * so repeated test runs reuse the same accounts instead of piling new ones
 * up in the Supabase project.
 */
export async function getOrCreateTestUser(user: TestAccount) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const signInResult = await supabase.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });

  // Sign-in fails the very first time this ever runs (the account doesn't
  // exist yet) — fall back to creating it. Every run after this, sign-in
  // succeeds and signUp() never gets called.
  const authResult = signInResult.error
    ? await supabase.auth.signUp({ email: user.email, password: user.password })
    : signInResult;

  if (authResult.error || !authResult.data.user || !authResult.data.session) {
    throw new Error(
      `Could not sign in or create test user ${user.email}: ${
        authResult.error?.message ?? "no session returned — is 'Confirm email' still enabled in Supabase?"
      }`
    );
  }

  const userId = authResult.data.user.id;

  const { data: existingBusiness } = await supabase
    .from("businesses")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  let businessId: string | undefined = existingBusiness?.id;

  if (!businessId) {
    const { data: newBusiness, error } = await supabase
      .from("businesses")
      .insert({ user_id: userId, name: user.businessName })
      .select("id")
      .single();

    if (error || !newBusiness) {
      throw new Error(`Could not create a business for ${user.email}: ${error?.message}`);
    }
    businessId = newBusiness.id;
  }

  // Re-check explicitly (rather than trusting the reassignment above) so
  // TypeScript can confirm businessId is definitely a string by this
  // point, not "string | undefined".
  if (!businessId) {
    throw new Error(`Could not resolve a business id for ${user.email}`);
  }

  return { supabase, userId, businessId };
}
