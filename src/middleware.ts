// src/middleware.ts
/**
 * Authentication & Authorization middleware
 *
 * - Uses Auth.js v5 `auth()` wrapper (Edge-safe, production-safe)
 * - Protects user-only routes (orders / profile / settings)
 * - Protects admin-only routes (admin / api/admin)
 * - Avoids `getToken()` which is unreliable in Edge + secure cookie setups
 */

import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // `req.auth` is populated by Auth.js middleware wrapper
  // - null/undefined -> not logged in
  // - object -> logged in session
  const isLoggedIn = !!req.auth;

  /**
   * Routes that require a logged-in user
   */
  const isProtectedRoute =
    pathname.startsWith("/orders") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/settings");

  /**
   * Routes that require admin privileges
   * (admin pages + admin APIs)
   */
  const isAdminRoute =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api/admin");

  /**
   * If the user is NOT logged in and tries to access
   * a protected or admin route, redirect to sign-in page
   */
  if ((isProtectedRoute || isAdminRoute) && !isLoggedIn) {
    const signInUrl = new URL("/auth/signin", req.nextUrl.origin);

    // Preserve full URL so user can be redirected back after login
    signInUrl.searchParams.set("callbackUrl", req.nextUrl.href);

    return NextResponse.redirect(signInUrl);
  }

  /**
   * If user is logged in but tries to access admin-only routes,
   * check role from session
   */
  if (isAdminRoute) {
    const role = (req.auth?.user as any)?.role;

    if (role !== "admin") {
      // Non-admin users are redirected to home page
      return NextResponse.redirect(new URL("/", req.nextUrl.origin));
    }
  }

  // All checks passed -> continue request
  return NextResponse.next();
});

/**
 * Only run middleware on these routes
 * (avoids unnecessary overhead on public pages and static assets)
 */
export const config = {
  matcher: [
    "/orders/:path*",
    "/profile/:path*",
    "/settings/:path*",
    "/admin/:path*",
    "/api/admin/:path*",
  ],
};
