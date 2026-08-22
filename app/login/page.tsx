"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, type AuthActionState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";

const initialState: AuthActionState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-16 dark:bg-black">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Log in
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Welcome back to Vivva Admin.
        </p>

        <form action={formAction} className="mt-8 flex flex-col gap-4">
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
            autoComplete="current-password"
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
            {pending ? "Logging in…" : "Log in"}
          </Button>
        </form>

        <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-medium text-zinc-950 underline dark:text-zinc-50"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
