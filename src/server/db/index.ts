import 'dotenv/config'
import { drizzle } from 'drizzle-orm/node-postgres'
import { env } from '@/env'
import * as schema from './schema'

export const db = drizzle(env.DATABASE_URL, {
  schema,
})

// Accepts either the root `db` or a transaction handle from `db.transaction`.
// Use this for helpers that need to run inside an outer caller's transaction.
export type DbOrTx =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0]
