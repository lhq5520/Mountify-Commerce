import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // choose correct cookie name
  const isSecure = req.url.startsWith('https');
  
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
    cookieName: isSecure ? "__Secure-authjs.session-token" : "authjs.session-token",
  });

  const protectedRoutes = ['/orders', '/profile', '/settings'];
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  const isAdminRoute = pathname.startsWith('/admin');

  if (isProtectedRoute || isAdminRoute) {
    if (!token) {
      const signInUrl = new URL('/auth/signin', req.url);
      signInUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(signInUrl);
    }

    if (isAdminRoute && token.role !== 'admin') {
      const homeUrl = new URL('/', req.url);
      return NextResponse.redirect(homeUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/orders/:path*',
    '/profile/:path*',
    '/settings/:path*',
    '/admin/:path*',
    '/api/admin/:path*',
  ],
};