import { createId } from '@paralleldrive/cuid2'
import { index, pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core'
import { members } from './auth'
import { changeRequestStatusEnum, statusEnum } from './base'
import { media } from './media'
import { projects } from './project'

export const requirements = pgTable(
  'requirements',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => `req_${createId()}`),
    projectId: text('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),
    authorId: text('author_id').references(() => members.id, {
      onDelete: 'set null',
    }),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull().default(''),
    status: statusEnum('status').default('draft').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    unique().on(t.projectId, t.slug),
    index('requirements_project_id_idx').on(t.projectId),
  ]
)

export const requirementRecipients = pgTable('requirement_recipients', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => `rr_${createId()}`),
  requirementId: text('requirement_id')
    .references(() => requirements.id, { onDelete: 'cascade' })
    .notNull(),
  clientMemberId: text('client_member_id')
    .references(() => members.id, { onDelete: 'cascade' })
    .notNull(),
  sentAt: timestamp('sent_at').defaultNow().notNull(),
})

export const requirementSignatures = pgTable('requirement_signatures', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => `rs_${createId()}`),
  requirementId: text('requirement_id')
    .references(() => requirements.id, { onDelete: 'cascade' })
    .notNull(),
  clientMemberId: text('client_member_id')
    .references(() => members.id, { onDelete: 'cascade' })
    .notNull(),
  signedAt: timestamp('signed_at').defaultNow().notNull(),
  mediaId: text('media_id').references(() => media.id, {
    onDelete: 'set null',
  }),
})

export const requirementChangeRequests = pgTable(
  'requirement_change_requests',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => `rcr_${createId()}`),
    requirementId: text('requirement_id')
      .references(() => requirements.id, { onDelete: 'cascade' })
      .notNull(),
    requestedByMemberId: text('requested_by_member_id').references(
      () => members.id,
      { onDelete: 'set null' }
    ),
    description: text('description').notNull(),
    referencedThreadIds: text('referenced_thread_ids').array(),
    status: changeRequestStatusEnum('status').default('pending').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    resolvedAt: timestamp('resolved_at'),
  }
)
