/**
 * Schema/migration smoke test.
 *
 * Assumes migrations have been applied to DATABASE_URL (CI does this in a
 * dedicated step; locally: `bun db:migrate`). We don't re-run them here —
 * we just verify the resulting schema has the tables every domain expects.
 */
import { sql } from 'drizzle-orm'
import type { PgTableWithColumns } from 'drizzle-orm/pg-core'
import { beforeAll, describe, expect, it } from 'vitest'
import { db } from '@/server/db'
import * as schema from '@/server/db/schema'

const EXPECTED_TABLES: string[] = Object.keys(schema)
  // biome-ignore lint/performance/noDynamicNamespaceImportAccess: Needed here
  .map((e) => schema[e as keyof typeof schema] as PgTableWithColumns<any>)
  .map((e) => e?._?.name)
  .filter(Boolean)

let actualTables: Set<string>

beforeAll(async () => {
  const rows = await db.execute<{ tablename: string }>(sql`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  `)
  actualTables = new Set(rows.rows.map((r) => r.tablename))
})

describe('schema migrations', () => {
  it.each(EXPECTED_TABLES)('table %s exists', (table) => {
    expect(actualTables.has(table)).toBe(true)
  })
})
