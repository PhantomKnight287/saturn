/**
 * Smoke: `@/env` validates under the test setup and exposes required keys.
 * Catches accidental env-schema breakage that would otherwise blow up
 * every other test or boot of the app.
 */
import { describe, expect, it } from 'vitest'
import { env } from '@/env'

describe('env', () => {
  it('parses with test setup values', () => {
    expect(env.DATABASE_URL).toMatch(/^postgres(?:ql)?:\/\//)
    expect(env.BETTER_AUTH_SECRET).toBeTruthy()
    expect(env.NEXT_PUBLIC_BASE_URL).toBe('http://localhost:3000')
  })
})
