import { createId } from '@paralleldrive/cuid2'
import { index, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { members } from './auth'
import { threadStatusEnum } from './base'
import { projects } from './project'

export const threads = pgTable(
  'threads',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => `thread_${createId()}`),
    entityId: text('entity_id').notNull(),
    projectId: text('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),
    selectedText: text('selected_text').notNull(),
    status: threadStatusEnum('status').default('open').notNull(),
    createdByMemberId: text('created_by_member_id').references(
      () => members.id,
      {
        onDelete: 'set null',
      }
    ),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('threads_project_id_idx').on(table.projectId)]
)

export const threadMessages = pgTable('thread_messages', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => `thread_message_${createId()}`),
  threadId: text('thread_id')
    .references(() => threads.id, { onDelete: 'cascade' })
    .notNull(),
  authorMemberId: text('author_member_id').references(() => members.id, {
    onDelete: 'set null',
  }),
  body: text('body').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
