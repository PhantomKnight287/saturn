import { expect, test } from '@playwright/test'
import { PUBLIC_ROUTES } from '@/routes'

for (const path of PUBLIC_ROUTES) {
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
  const response = await page.goto('/this-page-does-not-exist-xyz')
  await page.waitForTimeout(5000)
  expect(page.url()).toBe('/error/404')
  expect(response?.status()).toBe(404)
})
