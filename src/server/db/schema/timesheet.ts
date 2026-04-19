import { createId } from '@paralleldrive/cuid2'
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { members } from './auth'
import { statusEnum } from './base'
import { invoices } from './invoice'
import { projects } from './project'
import { requirements } from './requirements'

export const timeEntries = pgTable(
  'time_entries',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => `te_${createId()}`),
    projectId: text('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),
    requirementId: text('requirement_id').references(() => requirements.id, {
      onDelete: 'set null',
    }),
    memberId: text('member_id')
      .references(() => members.id, { onDelete: 'cascade' })
      .notNull(),
    description: text('description').notNull(),
    date: timestamp('date').notNull(),
    durationMinutes: integer('duration_minutes').notNull(),
    billable: boolean('billable').default(true).notNull(),
    status: statusEnum('status').default('draft').notNull(),
    rejectReason: text('reject_reason'),
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
    index('time_entries_project_id_status_idx').on(
      table.projectId,
      table.status
    ),
    index('time_entries_member_id_idx').on(table.memberId),
  ]
)

export const memberRates = pgTable(
  'member_rates',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => `mr_${createId()}`),
    memberId: text('member_id')
      .references(() => members.id, { onDelete: 'cascade' })
      .notNull(),
    projectId: text('project_id').references(() => projects.id, {
      onDelete: 'cascade',
    }),
    hourlyRate: integer('hourly_rate').notNull(),
    currency: text('currency').default('USD').notNull(),
    effectiveFrom: timestamp('effective_from').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('member_rate_effective_unique').on(
      table.memberId,
      table.projectId,
      table.effectiveFrom
    ),
  ]
)

export const timesheetReportStatusEnum = pgEnum('timesheet_report_status', [
  'draft',
  'sent',
  'approved',
  'disputed',
])

export const timesheetReports = pgTable('timesheet_reports', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => `tr_${createId()}`),
  projectId: text('project_id')
    .references(() => projects.id, { onDelete: 'cascade' })
    .notNull(),
  title: text('title').notNull(),
  status: timesheetReportStatusEnum('status').default('draft').notNull(),
  totalMinutes: integer('total_minutes').notNull(),
  totalAmount: integer('total_amount_cents').default(0).notNull(),
  currency: text('currency').default('USD').notNull(),
  sentByMemberId: text('sent_by_member_id').references(() => members.id, {
    onDelete: 'set null',
  }),
  disputeReason: text('dispute_reason'),
  sentAt: timestamp('sent_at'),
  respondedAt: timestamp('responded_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
})

export const timesheetReportEntries = pgTable(
  'timesheet_report_entries',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => `tre_${createId()}`),
    reportId: text('report_id')
      .references(() => timesheetReports.id, { onDelete: 'cascade' })
      .notNull(),
    timeEntryId: text('time_entry_id')
      .references(() => timeEntries.id, { onDelete: 'cascade' })
      .notNull(),
  },
  (table) => [
    index('timesheet_report_entries_report_id_idx').on(table.reportId),
  ]
)

export const timesheetReportRecipientStatusEnum = pgEnum(
  'timesheet_report_recipient_status',
  ['pending', 'approved', 'disputed']
)

export const timesheetReportRecipients = pgTable(
  'timesheet_report_recipients',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => `trr_${createId()}`),
    reportId: text('report_id')
      .references(() => timesheetReports.id, { onDelete: 'cascade' })
      .notNull(),
    clientMemberId: text('client_member_id')
      .references(() => members.id, { onDelete: 'cascade' })
      .notNull(),
    status: timesheetReportRecipientStatusEnum('status')
      .default('pending')
      .notNull(),
    disputeReason: text('dispute_reason'),
    respondedAt: timestamp('responded_at'),
  },
  (table) => [
    index('timesheet_report_recipients_report_id_idx').on(table.reportId),
  ]
)

export const pendingMemberRates = pgTable(
  'pending_member_rates',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => `pmr_${createId()}`),
    invitationId: text('invitation_id').notNull().unique(),
    organizationId: text('organization_id').notNull(),
    email: text('email').notNull(),
    hourlyRate: integer('hourly_rate').notNull(),
    currency: text('currency').default('USD').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('pending_member_rates_org_email_idx').on(
      table.organizationId,
      table.email
    ),
  ]
)

export const projectBudgets = pgTable('project_budgets', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => `pb_${createId()}`),
  projectId: text('project_id')
    .references(() => projects.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  budgetMinutes: integer('budget_minutes').notNull(),
  alertThreshold: integer('alert_threshold').default(80).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
})
