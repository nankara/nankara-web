import { NextResponse } from 'next/server';

// Server-side gate for the authenticated sections. This only checks that a
// session cookie is *present* — it can't verify the JWT signature here — so the
// client guards (useAdminGuard / AccountShell) still do the real check. Its job
// is to stop the protected shell from ever painting for a signed-out visitor.
//
// `/api/*` is deliberately not matched: those requests are proxied to the
// backend by next.config.mjs and must pass through untouched.

const ADMIN_COOKIE = 'nk_admin';
const CUSTOMER_COOKIE = 'nk_customer';

export function middleware(request) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/admin')) {
    // The login page itself must stay reachable.
    if (pathname === '/admin/login' || pathname.startsWith('/admin/login/')) {
      return NextResponse.next();
    }
    if (!request.cookies.has(ADMIN_COOKIE)) {
      const url = request.nextUrl.clone();
      url.pathname = '/admin/login';
      url.search = `?next=${encodeURIComponent(pathname)}`;
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (pathname.startsWith('/account')) {
    if (!request.cookies.has(CUSTOMER_COOKIE)) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.search = `?next=${encodeURIComponent(pathname)}`;
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/account/:path*'],
};
