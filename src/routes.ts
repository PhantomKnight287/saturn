import type { NextRequest } from 'next/server'

export const PUBLIC_ROUTES: string[] = [
  '/',
  '/api/og',
  '/polar/webhooks',
  '/opengraph-image.png',
  '/twitter-image.png',
  '/sitemap.xml',
  '/manifest.webmanifest',
]
export const PUBLIC_PREFIXES: string[] = ['/changelog', '/blog']
export const AUTH_PREFIX: string = '/auth'
export const API_AUTH_PREFIX: string = '/api/auth'
export const ERROR_PREFIX: string = '/error/'
export const DEFAULT_LOGIN_REDIRECT: string = '/dashboard'

export function isApiAuth(pathname: string): boolean {
  return startsWith(pathname, API_AUTH_PREFIX)
}

export function isAuthRoute(pathname: string): boolean {
  return startsWith(pathname, AUTH_PREFIX)
}

export function isPublicRoute(pathname: string): boolean {
  return (
    isPathEqual(pathname, PUBLIC_ROUTES) ||
    startsWith(pathname, ERROR_PREFIX) ||
    PUBLIC_PREFIXES.some((p) => startsWith(pathname, p))
  )
}

// Utils
function isPathEqual(pathname: string, paths: string[]): boolean {
  return paths.includes(pathname)
}

function startsWith(pathname: string, prefix: string): boolean {
  return pathname.startsWith(prefix)
}

export function getSignInUrl(request: NextRequest, redirectTo?: string): URL {
  const rt = redirectTo ?? request.nextUrl.pathname + request.nextUrl.search
  return new URL(
    `${AUTH_PREFIX}/sign-in?redirectTo=${encodeURIComponent(rt)}`,
    request.url
  )
}
