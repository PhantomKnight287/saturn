import { createId } from '@paralleldrive/cuid2'
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'
import { members, organizations } from './auth'
import { statusEnum } from './base'
import { invoices } from './invoice'
import { media } from './media'
import { milestones } from './milestone'
import { projects } from './project'

export const expenseCategories = pgTable('expense_categories', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => `ec_${createId()}`),
  organizationId: text('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  color: text('color'),
  isArchived: boolean('is_archived').default(false),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
})

export const expenses = pgTable(
  'expenses',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => `exp_${createId()}`),
    projectId: text('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),
    memberId: text('member_id')
      .references(() => members.id, { onDelete: 'cascade' })
      .notNull(),
    categoryId: text('category_id')
      .references(() => expenseCategories.id, { onDelete: 'set null' })
      .notNull(),
    milestoneId: text('milestone_id').references(() => milestones.id, {
      onDelete: 'set null',
    }),
    title: text('title').notNull(),
    description: text('description'),
    amountCents: integer('amount_cents').notNull(),
    currency: text('currency').notNull().default('USD'),
    date: timestamp().notNull(),
    billable: boolean().default(true).notNull(),
    status: statusEnum().notNull().default('draft'),
    rejectReason: text('reject_reason'),
    receiptMediaId: text('receipt_media_id').references(() => media.id, {
      onDelete: 'set null',
    }),
    invoiceId: text('invoice_id').references(() => invoices.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('expenses_project_id_status_idx').on(table.projectId, table.status),
    index('expenses_member_id_idx').on(table.memberId),
  ]
)
