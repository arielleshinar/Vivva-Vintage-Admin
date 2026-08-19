"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loginSchema, signupSchema } from "@/lib/validation/auth";
import type { Business } from "@/lib/types/database";

export type AuthActionState = {
  error?: string;
  fieldErrors?: {
    businessName?: string[];
    email?: string[];
    password?: string[];
  };
};

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

  if (!data.user || !data.session) {
    return {
      error:
        "Account created, but couldn't sign you in automatically. If email confirmation is enabled in the Supabase project, disable it (Authentication → Providers → Email → Confirm email) — this MVP expects plain email/password signup with no confirmation step.",
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

  redirect("/dashboard");
}

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
