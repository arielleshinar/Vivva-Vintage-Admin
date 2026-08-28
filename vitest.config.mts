import { defineConfig } from "vitest/config";

// Minimal Vitest setup for testing plain TypeScript logic (lib/*) — no
// React rendering yet, so no jsdom/browser environment is configured.
// If we later want to test components or Server Actions directly, this
// file is where that setup (jsdom, @testing-library/react, mocking
// Supabase) would get added.
export default defineConfig({
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
});
