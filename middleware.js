import { NextResponse } from 'next/server'

/**
 * Edge Middleware Guard
 *
 * Because NextAuth uses the `database` session strategy (for revocable server
 * sessions), the session token cookie is an opaque database token rather than
 * a JWT. Edge middleware checks for the presence of the session cookie as a
 * fast first-pass gate, while Server Layouts (`app/admin/layout.jsx`,
 * `app/(customer)/layout.jsx`) and API routes perform full `getServerSession`
 * database verification and RBAC checks.
 */
export function middleware(req) {
  const { pathname } = req.nextUrl

  const sessionToken =
    req.cookies.get('__Secure-next-auth.session-token')?.value ||
    req.cookies.get('next-auth.session-token')?.value

  // ── /admin/* routes require a session cookie ──────────────────────────
  if (pathname.startsWith('/admin')) {
    if (pathname === '/admin/login') return NextResponse.next()

    if (!sessionToken) {
      const loginUrl = new URL('/admin/login', req.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // ── Customer portal routes require a session cookie ───────────────────
  if (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/bookings') ||
    pathname.startsWith('/rewards') ||
    pathname.startsWith('/tickets')
  ) {
    if (!sessionToken) {
      const callbackUrl = encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search)
      return NextResponse.redirect(
        new URL(`/login?callbackUrl=${callbackUrl}`, req.url)
      )
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/dashboard/:path*',
    '/profile/:path*',
    '/bookings/:path*',
    '/rewards/:path*',
    '/tickets/:path*',
  ],
}
