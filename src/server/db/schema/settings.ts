import { createId } from '@paralleldrive/cuid2'
import { sql } from 'drizzle-orm'
import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { organizations } from './auth'
import { projects } from './project'

export const timesheetDurationEnum = pgEnum('timesheet_duration', [
  'weekly',
  'biweekly',
  'monthly',
])

export const clientInvolvementEnum = pgEnum('client_involvement', [
  'full',
  'partial',
  'none',
])

export const settings = pgTable(
  'settings',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => `os_${createId()}`),
    organizationId: text('organization_id')
      .references(() => organizations.id, { onDelete: 'cascade' })
      .notNull(),
    projectId: text('project_id').references(() => projects.id, {
      onDelete: 'cascade',
    }),
    memberRate: integer('member_rate').default(0).notNull(),
    currency: text('currency').default('USD').notNull(),
    invoiceNumberTemplate: text('invoice_number_template')
      .default('INV-%year(short)%month(num)-%seq(4)')
      .notNull(),
    timesheetDuration: timesheetDurationEnum('timesheet_duration')
      .default('weekly')
      .notNull(),
    clientInvolvement: clientInvolvementEnum('client_involvement')
      .default('full')
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex('org_settings_org_project_unique').on(
      table.organizationId,
      table.projectId
    ),
    uniqueIndex('org_settings_org_only_unique')
      .on(table.organizationId)
      .where(sql`${table.projectId} IS NULL`),
    index('org_settings_org_id_idx').on(table.organizationId),
  ]
)
