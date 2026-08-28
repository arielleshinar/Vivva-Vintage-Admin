import { NextRequest } from "next/server";
import { getRedirectUrl } from "next/experimental/testing/server";
import { describe, it, expect } from "vitest";
import { updateSession } from "./proxy";

// Tests the "logged-out visitor gets sent to /login" behavior from the
// test plan. This calls updateSession() directly — the exact function
// proxy.ts (at the project root) hands every request to — using
// next/experimental/testing/server's NextRequest + getRedirectUrl, which
// is Next.js's own documented way to unit test this kind of routing logic
// without needing a real running server.

const PROTECTED_ROUTES = ["/dashboard", "/inventory", "/receipts", "/reports"];

/** Returns the pathname a response redirects to, or null if it isn't a redirect at all. */
function redirectPath(response: Awaited<ReturnType<typeof updateSession>>) {
  const url = getRedirectUrl(response);
  return url ? new URL(url).pathname : null;
}

describe("updateSession: logged-out visitors", () => {
  it.each(PROTECTED_ROUTES)(
    "redirects an unauthenticated request to %s over to /login",
    async (path) => {
      const request = new NextRequest(`http://localhost:3000${path}`);
      const response = await updateSession(request);

      expect(redirectPath(response)).toBe("/login");
    }
  );

  it("does not redirect an unauthenticated request to /login itself", async () => {
    const request = new NextRequest("http://localhost:3000/login");
    const response = await updateSession(request);

    expect(redirectPath(response)).toBeNull();
  });

  it("does not redirect an unauthenticated request to /signup", async () => {
    const request = new NextRequest("http://localhost:3000/signup");
    const response = await updateSession(request);

    expect(redirectPath(response)).toBeNull();
  });

  it("treats a route we didn't explicitly list as protected too — everything is protected by default", async () => {
    const request = new NextRequest("http://localhost:3000/some-future-page");
    const response = await updateSession(request);

    expect(redirectPath(response)).toBe("/login");
  });
});
