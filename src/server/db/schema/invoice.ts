import { createId } from '@paralleldrive/cuid2'
import {
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'
import { members } from './auth'
import { media } from './media'
import { projects } from './project'
import { requirements } from './requirements'

export const invoiceStatusEnum = pgEnum('invoice_status', [
  'draft',
  'sent',
  'disputed',
  'paid',
  'cancelled',
])

export const invoices = pgTable(
  'invoices',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => `inv_${createId()}`),
    projectId: text('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),
    invoiceNumber: text('invoice_number').notNull().unique(),
    status: invoiceStatusEnum('status').default('draft').notNull(),
    issueDate: timestamp('issue_date').defaultNow().notNull(),
    dueDate: timestamp('due_date'),
    notes: text('notes'),
    totalAmount: numeric('total_amount', { precision: 16, scale: 4 })
      .default('0')
      .notNull(),
    currency: text('currency').default('USD').notNull(),
    senderLogo: text('sender_logo').references(() => media.id, {
      onDelete: 'set null',
    }),
    senderSignature: text('sender_signature').references(() => media.id, {
      onDelete: 'set null',
    }),
    senderName: text('sender_name'),
    senderAddress: text('sender_address'),
    senderCustomFields: jsonb('sender_custom_fields').$type<
      { label: string; value: string }[]
    >(),
    // Client (To) details
    clientName: text('client_name'),
    clientAddress: text('client_address'),
    clientCustomFields: jsonb('client_custom_fields').$type<
      { label: string; value: string }[]
    >(),
    // Additional details
    paymentTerms: text('payment_terms'),
    terms: text('terms'),
    // Discount
    discountLabel: text('discount_label'),
    discountAmount: numeric('discount_amount', { precision: 16, scale: 4 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('invoices_project_id_status_idx').on(table.projectId, table.status),
  ]
)

export const invoiceRecipients = pgTable('invoice_recipients', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => `ircpt_${createId()}`),
  invoiceId: text('invoice_id')
    .references(() => invoices.id, { onDelete: 'cascade' })
    .notNull(),
  clientMemberId: text('client_member_id')
    .references(() => members.id, { onDelete: 'cascade' })
    .notNull(),
})

export const invoiceItems = pgTable('invoice_items', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => `ii_${createId()}`),
  invoiceId: text('invoice_id')
    .references(() => invoices.id, { onDelete: 'cascade' })
    .notNull(),
  description: text('description').notNull(),
  quantity: numeric('quantity', { precision: 10, scale: 4 }).notNull(),
  unitPrice: numeric('unit_price', { precision: 16, scale: 4 }).notNull(),
  amount: numeric('amount', { precision: 16, scale: 4 }).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
})

export const invoiceRequirements = pgTable('invoice_requirements', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => `ir_${createId()}`),
  invoiceId: text('invoice_id')
    .references(() => invoices.id, { onDelete: 'cascade' })
    .notNull(),
  requirementId: text('requirement_id')
    .references(() => requirements.id, { onDelete: 'cascade' })
    .notNull(),
})
