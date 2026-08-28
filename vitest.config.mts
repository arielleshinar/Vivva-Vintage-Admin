import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";

// Minimal Vitest setup for testing plain TypeScript logic (lib/*) — no
// React rendering yet, so no jsdom/browser environment is configured.
// If we later want to test components or Server Actions directly, this
// file is where that setup (jsdom, @testing-library/react, mocking
// Supabase) would get added.
export default defineConfig(({ mode }) => {
  // Vite only loads .env files into `import.meta.env` automatically, not
  // into plain `process.env` — but our Supabase clients (and the RLS
  // integration tests) read `process.env`, the same way the real app
  // does. loadEnv() reads .env.local (among others) directly, and we copy
  // the result onto process.env ourselves so test files see the same
  // NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY the app uses.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ""));

  return {
    resolve: {
      // Mirrors tsconfig.json's "@/*" path alias, so test files can import
      // "@/lib/dashboard/stats" the same way the app code does.
      alias: {
        "@": import.meta.dirname,
      },
    },
    test: {
      environment: "node",
      include: ["**/*.test.ts"],
      exclude: ["node_modules", ".next"],
    },
  };
});
