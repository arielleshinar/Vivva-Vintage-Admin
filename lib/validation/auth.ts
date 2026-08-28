import { z } from "zod";

// Zod schemas describing exactly what a valid signup/login submission looks
// like. These run on the server (inside app/actions/auth.ts) — never trust
// data from the browser, even though the form also has basic HTML
// validation (like `required`) for instant feedback.

/** Rules for creating a new account: business name, a real email, and a password of at least 8 characters. */
export const signupSchema = z.object({
  businessName: z.string().trim().min(1, "Business name is required"),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

/** Rules for logging in: just needs a real-looking email and a non-empty password (we don't re-check length here — Supabase itself checks the password when we try to sign in). */
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});
