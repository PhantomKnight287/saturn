import { createId } from '@paralleldrive/cuid2'
import {
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { members, organizations, teams } from './auth'

export const projects = pgTable('projects', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => `prj_${createId()}`),
  name: text('name').notNull(),
  description: text('description'),
  slug: text('slug').notNull().unique(),
  organizationId: text('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  dueDate: timestamp('due_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
})

export const projectTeamAssignments = pgTable(
  'project_team_assignments',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => `pta_${createId()}`),
    projectId: text('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),
    teamId: text('team_id')
      .references(() => teams.id, { onDelete: 'cascade' })
      .notNull(),
    assignedAt: timestamp('assigned_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('project_team_unique').on(table.projectId, table.teamId),
  ]
)

export const projectMemberAssignments = pgTable(
  'project_member_assignments',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => `pma_${createId()}`),
    projectId: text('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),
    memberId: text('member_id')
      .references(() => members.id, { onDelete: 'cascade' })
      .notNull(),
    role: text('role').default('member').notNull(),
    assignedAt: timestamp('assigned_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('project_member_unique').on(table.projectId, table.memberId),
  ]
)

export const projectClientAssignments = pgTable(
  'project_client_assignments',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => `pca_${createId()}`),
    projectId: text('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),
    memberId: text('member_id')
      .references(() => members.id, { onDelete: 'cascade' })
      .notNull(),
    assignedAt: timestamp('assigned_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('project_client_unique').on(table.projectId, table.memberId),
  ]
)

export const projectInvitationTypeEnum = pgEnum('project_invitation_type', [
  'member',
  'client',
])

export const projectInvitations = pgTable('project_invitations', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => `pi_${createId()}`),
  invitationId: text('invitation_id').notNull().unique(),
  projectId: text('project_id')
    .references(() => projects.id, { onDelete: 'cascade' })
    .notNull(),
  type: projectInvitationTypeEnum('type').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
