"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signup, type AuthActionState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";

const initialState: AuthActionState = {};

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signup, initialState);

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-16 dark:bg-black">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Create your account
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Set up your business on Vivva Admin.
        </p>

        <form action={formAction} className="mt-8 flex flex-col gap-4">
          <FormField
            label="Business name"
            name="businessName"
            type="text"
            autoComplete="organization"
            required
            error={state.fieldErrors?.businessName?.[0]}
          />
          <FormField
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            required
            error={state.fieldErrors?.email?.[0]}
          />
          <FormField
            label="Password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            error={state.fieldErrors?.password?.[0]}
          />

          {state.error && (
            <p
              role="alert"
              className="text-sm text-red-600 dark:text-red-400"
            >
              {state.error}
            </p>
          )}

          <Button type="submit" disabled={pending} className="mt-2">
            {pending ? "Creating account…" : "Sign up"}
          </Button>
        </form>

        <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-zinc-950 underline dark:text-zinc-50"
          >
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
