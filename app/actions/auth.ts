"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loginSchema, signupSchema } from "@/lib/validation/auth";
import type { Business } from "@/lib/types/database";

// Server Actions for the two auth forms (app/signup/page.tsx and
// app/login/page.tsx). A Server Action is a function that runs on the
// server but gets called directly from a <form> in the browser — React
// handles the network request for us.

/**
 * The shape every action in this file returns. Nothing is set on success
 * (the action just redirects instead — see below), so the only fields the
 * UI needs to check are the error cases:
 *   - `error`: a general problem, shown as one message (e.g. wrong password)
 *   - `fieldErrors`: per-field problems, shown next to the specific input
 */
export type AuthActionState = {
  error?: string;
  fieldErrors?: {
    businessName?: string[];
    email?: string[];
    password?: string[];
  };
};

/**
 * Creates a brand-new account and business.
 *
 * Steps: validate the form → ask Supabase Auth to create the user → create
 * a matching row in the `businesses` table for them → send them to the
 * dashboard. If anything fails partway through, we return a helpful error
 * instead of throwing, so the form can show it inline.
 *
 * `_prevState` is required by React's `useActionState` hook (see the
 * signup page) but we don't use it — the action doesn't need to know what
 * the previous result was.
 */
export async function signup(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = signupSchema.safeParse({
    businessName: formData.get("businessName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { businessName, email, password } = parsed.data;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return { error: error.message };
  }

  // Supabase can succeed here but return no session if the project has
  // "Confirm email" turned on (it requires the user to click a link in
  // their inbox first). This app expects that setting to be OFF, so a
  // missing session means something's misconfigured, not a normal error.
  if (!data.user || !data.session) {
    console.error("Signup succeeded but no session returned — check Supabase 'Confirm email' setting");
    return {
      error: "Something went wrong setting up your account. Please try again or contact support.",
    };
  }

  const businessInsert: Pick<Business, "user_id" | "name"> = {
    user_id: data.user.id,
    name: businessName,
  };
  const { error: businessError } = await supabase
    .from("businesses")
    .insert(businessInsert);

  if (businessError) {
    return {
      error:
        "Your account was created, but we couldn't set up your business. Please contact support.",
    };
  }

  // redirect() throws internally to stop the function here — code after
  // this line never runs on a successful signup.
  redirect("/dashboard");
}

/**
 * Logs an existing user in.
 *
 * Validates the form, asks Supabase to check the email/password, and
 * redirects to the dashboard on success. We deliberately show one generic
 * "Invalid email or password" message rather than Supabase's raw error —
 * that avoids hinting to an attacker whether a given email is registered.
 */
export async function login(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: "Invalid email or password." };
  }

  redirect("/dashboard");
}

/**
 * Logs the current user out and sends them to the login page. Bound
 * directly to a <form action={signOut}> in the nav — there's no form data
 * to validate and nothing that can meaningfully fail here from the user's
 * point of view, so this doesn't need the { error } state shape the other
 * two actions use.
 */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
