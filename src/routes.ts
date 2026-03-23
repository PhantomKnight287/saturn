import type { NextRequest } from 'next/server'

export const PUBLIC_ROUTES: string[] = ['/about']
export const AUTH_PREFIX: string = '/auth'
export const API_AUTH_PREFIX: string = '/api/auth'
export const DEFAULT_LOGIN_REDIRECT: string = '/'

export function isApiAuth(pathname: string): boolean {
  return startsWith(pathname, API_AUTH_PREFIX)
}

export function isAuthRoute(pathname: string): boolean {
  return startsWith(pathname, AUTH_PREFIX)
}

export function isPublicRoute(pathname: string): boolean {
  return isPathEqual(pathname, PUBLIC_ROUTES)
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
