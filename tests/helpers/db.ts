/**
 * DB helpers for integration tests.
 *
 * Strategy: one Postgres database (`saturn_test`) shared across the suite,
 * truncated between tests. Tests opt in by calling `resetDb()` in `beforeEach`.
 *
 * Run migrations once before the suite starts:
 *   DATABASE_URL=postgresql://...:5432/saturn_test bun db:migrate
 *
 * Layer-2 service tests should import `db` from here, not from `@/server/db`,
 * so we can wrap each test in a transaction in the future if desired.
 */
import { sql } from 'drizzle-orm'
import { db } from '@/server/db'

/**
 * Truncate every user table. Cheap because the DB is local + small;
 * keeps tests isolated without re-running migrations.
 */
export async function resetDb() {
  const rows = await db.execute<{ tablename: string }>(sql`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename != '__drizzle_migrations'
  `)
  const tables = rows.rows.map((r) => `"${r.tablename}"`).join(', ')
  if (!tables) {
    return
  }
  await db.execute(sql.raw(`TRUNCATE ${tables} RESTART IDENTITY CASCADE`))
}
