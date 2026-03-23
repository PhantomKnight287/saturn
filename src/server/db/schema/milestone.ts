import { createId } from '@paralleldrive/cuid2'
import {
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { projects } from './project'
import { requirements } from './requirements'

export const milestoneStatusEnum = pgEnum('milestone_status', [
  'pending',
  'in_progress',
  'completed',
  'blocked',
])

export const milestones = pgTable('milestones', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => `ms_${createId()}`),
  projectId: text('project_id')
    .references(() => projects.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  description: text('description'),
  status: milestoneStatusEnum('status').default('pending').notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  dueDate: timestamp('due_date'),
  completedAt: timestamp('completed_at'),
  budgetMinutes: integer('budget_minutes'),
  currency: text('currency').default('USD'),
  budgetAmountCents: integer('budget_amount_cents'),
  blockReason: text('block_reason'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
})

export const milestoneRequirements = pgTable(
  'milestone_requirements',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => `msr_${createId()}`),
    milestoneId: text('milestone_id')
      .references(() => milestones.id, { onDelete: 'cascade' })
      .notNull(),
    requirementId: text('requirement_id')
      .references(() => requirements.id, { onDelete: 'cascade' })
      .notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
  },
  (table) => [
    uniqueIndex('milestone_requirement_unique').on(
      table.milestoneId,
      table.requirementId
    ),
  ]
)
