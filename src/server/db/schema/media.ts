import { createId } from '@paralleldrive/cuid2'
import { integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { users } from './auth'

export const media = pgTable('media', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => `med_${createId()}`),
  userId: text('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  key: text('key').notNull().unique(),
  contentType: text('content_type').notNull(),
  size: integer('size').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
