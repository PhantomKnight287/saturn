import { expect, test } from '@playwright/test'

/**
 * Unauthenticated visitors to gated routes should be redirected to sign-in,
 * not handed the dashboard or shown a 500.
 */
const GATED_ROUTES = ['/dashboard', '/onboarding', '/account/profile'] as const

for (const path of GATED_ROUTES) {
  test(`unauthenticated ${path} redirects to auth`, async ({ page }) => {
    const response = await page.goto(path)
    expect(response?.status()).toBeLessThan(500)
    // Either we ended up on an auth route, or the server returned a redirect-y status.
    const url = page.url()
    const onAuthRoute = /\/(auth|sign-in|sign-up)/i.test(url)
    expect(onAuthRoute, `expected redirect to auth, ended at ${url}`).toBe(true)
  })
}
