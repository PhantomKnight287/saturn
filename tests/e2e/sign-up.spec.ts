import { expect, test } from '@playwright/test'
import { makeTestUser, signUp } from './helpers/auth'

/**
 * Sign-up smoke: the form submits and we're either told to verify our email
 * or sent into the onboarding/dashboard path. We accept either outcome —
 * this test is a regression net for the sign-up form rendering & wiring,
 * not the full post-verification journey (that needs a mail catcher; see
 * helpers/auth.ts).
 */
test('sign-up form submits without crashing', async ({ page }) => {
  const user = makeTestUser('signup')
  await signUp(page, user)

  await page.waitForLoadState('networkidle')

  const body = (await page.locator('body').innerText()).toLowerCase()
  const url = page.url()

  const okSignals = [
    /verify/, // verification-required state
    /check.*email/,
    /onboarding/,
    /dashboard/,
  ]
  const matched = okSignals.some((re) => re.test(body) || re.test(url))
  expect(matched, `unexpected post-signup state: url=${url}\n${body.slice(0, 400)}`).toBe(true)
})
