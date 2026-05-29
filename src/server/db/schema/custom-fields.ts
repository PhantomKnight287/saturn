import { createId } from '@paralleldrive/cuid2'
import {
  boolean,
  foreignKey,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'
import { organizations } from './auth'
import { projects } from './project'

export const customFieldType = pgEnum('custom_field_type', [
  'text',
  'number',
  'select',
  'checkbox',
  'date',
  'datetime',
  'time',
])

export const customFields = pgTable(
  'custom_fields',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => `cf_${createId()}`),
    organizationId: text('organization_id')
      .references(() => organizations.id, { onDelete: 'cascade' })
      .notNull(),
    projectId: text('project_id'),
    label: text('label').notNull(),
    type: customFieldType('type').notNull(),
    required: boolean('required').default(false).notNull(),
    visibleToClient: boolean('visible_to_client').default(false).notNull(),
    defaultValue: text('default_value'),
    options: jsonb('options').$type<string[] | null>(),
    config: jsonb('config').$type<{
      maxLength?: number
      min?: number
      max?: number
    } | null>(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    index('custom_fields_project_idx').on(t.projectId),
    index('custom_fields_organization_idx').on(t.organizationId),
    foreignKey({
      columns: [t.projectId, t.organizationId],
      foreignColumns: [projects.id, projects.organizationId],
      name: 'custom_fields_project_id_organization_id_projects_id_organization_id_fk',
    }).onDelete('cascade'),
  ]
)
