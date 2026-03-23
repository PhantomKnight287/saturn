import { getSessionCookie } from 'better-auth/cookies'
import { type NextRequest, NextResponse } from 'next/server'

import {
  DEFAULT_LOGIN_REDIRECT,
  getSignInUrl,
  isApiAuth,
  isAuthRoute,
  isPublicRoute,
} from '@/routes'

export function proxy(request: NextRequest) {
  const session = getSessionCookie(request)

  const pathname = request.nextUrl.pathname

  if (isApiAuth(pathname)) {
    return NextResponse.next()
  }

  if (isAuthRoute(pathname)) {
    if (session) {
      return NextResponse.redirect(new URL(DEFAULT_LOGIN_REDIRECT, request.url))
    }
    return NextResponse.next()
  }

  if (!(session || isPublicRoute(pathname))) {
    return NextResponse.redirect(getSignInUrl(request))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
