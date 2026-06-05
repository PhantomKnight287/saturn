import { expect, test } from '@playwright/test'
import { PUBLIC_ROUTES } from '@/routes'

for (const path of PUBLIC_ROUTES) {
  if (path === '/polar/webhooks') {
    continue
  }
  test(`public route ${path} is reachable`, async ({ page }) => {
    const response = await page.goto(path)
    expect(response, `no response for ${path}`).not.toBeNull()
    expect(
      response!.status(),
      `${path} returned ${response!.status()}`
    ).toBeLessThan(400)
    await expect(page.locator('body')).toBeVisible()
  })
}

test('unknown route renders the 404 page', async ({ page }) => {
  await page.goto('/this-page-does-not-exist-xyz')
  await page.waitForTimeout(5000)
  const url = page.url()
  // A 404 page sends user to login url because workspace routes are also located at / so there is no way to know if page is 404 or a workspace slug so we redirect them to auth
  const onAuthRoute = /\/(auth|sign-in|sign-up)/i.test(url)
  expect(onAuthRoute).toBe(true)
})
