import { createId } from '@paralleldrive/cuid2'
import { integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { members } from './auth'

export const media = pgTable('media', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => `med_${createId()}`),
  organizationId: text('organization_id').notNull(),
  uploadedByMemberId: text('uploaded_by_member_id').references(
    () => members.id,
    { onDelete: 'set null' }
  ),
  name: text('name').notNull(),
  key: text('key').notNull().unique(),
  url: text('url').notNull(),
  contentType: text('content_type').notNull(),
  size: integer('size').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
