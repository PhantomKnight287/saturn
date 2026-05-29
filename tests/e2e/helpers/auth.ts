/**
 * Auth helpers for E2E tests.
 *
 * NOTE: better-auth is configured with `requireEmailVerification: true`
 * (see `src/server/auth/index.ts`). Full sign-up → app-access flows therefore
 * need one of:
 *   (a) a test-only env flag that disables verification,
 *   (b) capturing the verification URL from the outbound email (e.g. via a
 *       MailHog/Mailpit container wired into docker-compose.test.yml), or
 *   (c) seeding a pre-verified user directly into Postgres before the test.
 *
 * Option (c) is the lightest. Implement `seedVerifiedUser` below once Layer 2
 * has a user/auth service helper to call.
 */
import type { Page } from '@playwright/test'

export interface TestUser {
  email: string
  password: string
  name: string
}

export function makeTestUser(prefix = 'user'): TestUser {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
  return {
    email: `${prefix}+${id}@saturn-test.local`,
    password: 'Test1234!Test1234!',
    name: `Test ${prefix} ${id}`,
  }
}

export async function signUp(page: Page, user: TestUser) {
  await page.goto('/auth/sign-up')
  await page.getByLabel(/name/i).fill(user.name)
  await page.getByLabel(/email/i).fill(user.email)
  await page.getByLabel(/password/i).first().fill(user.password)
  await page.getByRole('button', { name: /sign up|create account/i }).click()
}

export async function signIn(page: Page, user: Pick<TestUser, 'email' | 'password'>) {
  await page.goto('/auth/sign-in')
  await page.getByLabel(/email/i).fill(user.email)
  await page.getByLabel(/password/i).fill(user.password)
  await page.getByRole('button', { name: /sign in|log in/i }).click()
}

// TODO(Layer 2): seed a verified user via direct DB insert so authenticated
// E2E paths don't need a mail catcher.
export async function seedVerifiedUser(_user: TestUser): Promise<void> {
  throw new Error('seedVerifiedUser is not implemented — see helpers/auth.ts')
}
