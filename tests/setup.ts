// /**
//  * Test bootstrap. Loads .env.test (real-ish creds, gitignored) so that
//  * `@/env` validation passes — S3 and Polar keys are required at boot
//  * even when individual tests don't touch them.
//  *
//  * Inside docker-compose.test.yml the env is provided via `env_file:` and
//  * this loader is a no-op (vars already set).
//  */
// import { config } from 'dotenv'
// import { existsSync } from 'node:fs'
// import { resolve } from 'node:path'

// const envTest = resolve(import.meta.dirname, '..', '.env.test')
// if (existsSync(envTest)) {
//   config({ path: envTest, override: false })
// }

// Fallbacks for anything still unset (e.g. CI without .env.test).
process.env.DATABASE_URL ??=
  'postgresql://postgres:postgres@localhost:5432/saturn_test'
process.env.BETTER_AUTH_SECRET ??= 'test-secret-not-for-production'
process.env.GITHUB_CLIENT_ID ??= 'test'
process.env.GITHUB_CLIENT_SECRET ??= 'test'
process.env.GOOGLE_CLIENT_ID ??= 'test'
process.env.GOOGLE_CLIENT_SECRET ??= 'test'
process.env.EMAIL_PROXY ??= 'http://localhost:9999'
process.env.NEXT_PUBLIC_BASE_URL ??= 'http://localhost:3000'
process.env.CORS_ORIGIN ??= 'http://localhost:3000'
