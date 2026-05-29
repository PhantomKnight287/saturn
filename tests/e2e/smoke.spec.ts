import { expect, test } from '@playwright/test'

test('marketing homepage renders', async ({ page }) => {
  const response = await page.goto('/')
  expect(response?.status()).toBeLessThan(400)
  await expect(page.locator('body')).toBeVisible()
})

test('homepage has no console errors on load', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (err) => errors.push(err.message))
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text())
    }
  })
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  expect(errors, errors.join('\n')).toHaveLength(0)
})
