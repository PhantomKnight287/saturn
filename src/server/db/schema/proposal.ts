import { createId } from '@paralleldrive/cuid2'
import {
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'
import { members } from './auth'
import { statusEnum } from './base'
import { media } from './media'
import { projects } from './project'

export const proposals = pgTable(
  'proposals',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => `prop_${createId()}`),
    projectId: text('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),
    authorId: text('author_id').references(() => members.id, {
      onDelete: 'set null',
    }),
    title: text('title').notNull(),
    slug: text('slug').notNull().unique(),
    body: text('body').notNull().default(''),
    terms: text('terms'),
    status: statusEnum('status').default('draft').notNull(),
    validUntil: timestamp('valid_until'),
    currency: text('currency').default('USD').notNull(),
    totalAmount: numeric('total_amount', { precision: 16, scale: 4 })
      .default('0')
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('proposals_project_id_idx').on(table.projectId)]
)

export const proposalDeliverables = pgTable('proposal_deliverables', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => `pd_${createId()}`),
  proposalId: text('proposal_id')
    .references(() => proposals.id, { onDelete: 'cascade' })
    .notNull(),
  title: text('title').notNull(),
  quantity: numeric('quantity', { precision: 10, scale: 4 }).notNull(),
  unitPrice: numeric('unit_price', { precision: 16, scale: 4 }).notNull(),
  amount: numeric('amount', { precision: 16, scale: 4 }).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
})

export const proposalRecipients = pgTable('proposal_recipients', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => `pr_${createId()}`),
  proposalId: text('proposal_id')
    .references(() => proposals.id, { onDelete: 'cascade' })
    .notNull(),
  clientMemberId: text('client_member_id')
    .references(() => members.id, { onDelete: 'cascade' })
    .notNull(),
  sentAt: timestamp('sent_at').defaultNow().notNull(),
})

export const proposalSignatures = pgTable('proposal_signatures', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => `ps_${createId()}`),
  proposalId: text('proposal_id')
    .references(() => proposals.id, { onDelete: 'cascade' })
    .notNull(),
  clientMemberId: text('client_member_id')
    .references(() => members.id, { onDelete: 'cascade' })
    .notNull(),
  mediaId: text('media_id').references(() => media.id, {
    onDelete: 'set null',
  }),
  signedAt: timestamp('signed_at').defaultNow().notNull(),
})
