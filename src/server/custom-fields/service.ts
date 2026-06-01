import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm'
import type { z } from 'zod'
import type {
  customFieldDefinitionCreateSchema,
  customFieldDefinitionUpdateSchema,
} from '@/lib/custom-fields'
import { projectAccess } from '@/server/access/project-access'
import { type DbOrTx, db } from '@/server/db'
import { customFields, timeEntries } from '@/server/db/schema'
import type { Role } from '@/types'

type CreateDefinition = z.infer<typeof customFieldDefinitionCreateSchema>
type UpdateDefinition = z.infer<typeof customFieldDefinitionUpdateSchema>

/**
 * Columns copied when a field is snapshotted into a project — both on project
 * creation (hybrid auto-import) and manual import. The new row gets a fresh ID
 * and no live link to the org source (CONTEXT.md: org fields are templates).
 */
const snapshotColumns = {
  label: customFields.label,
  type: customFields.type,
  required: customFields.required,
  visibleToClient: customFields.visibleToClient,
  defaultValue: customFields.defaultValue,
  options: customFields.options,
  config: customFields.config,
}

const normalizeDefinition = (
  definition: CreateDefinition | UpdateDefinition
) => ({
  label: definition.label,
  required: definition.required ?? false,
  visibleToClient: definition.visibleToClient ?? false,
  defaultValue: definition.defaultValue ?? null,
  options: definition.options ?? null,
  config: definition.config ?? null,
})

/** Org-level template fields, ordered oldest-first (CONTEXT.md: createdAt asc). */
const getOrgFields = (organizationId: string) =>
  db
    .select()
    .from(customFields)
    .where(
      and(
        eq(customFields.organizationId, organizationId),
        isNull(customFields.projectId)
      )
    )
    .orderBy(asc(customFields.createdAt))

/**
 * Project-level fields, oldest-first. When `role` is `client`, the list is
 * filtered to `visibleToClient = true` at query time — the single home for the
 * client-visibility rule (CONTEXT.md). Omit `role` for management/validation
 * surfaces that need every field regardless of visibility.
 */
const getProjectFields = (projectId: string, role?: Role) => {
  const conditions = [eq(customFields.projectId, projectId)]
  if (role === 'client') {
    conditions.push(eq(customFields.visibleToClient, true))
  }
  return db
    .select()
    .from(customFields)
    .where(and(...conditions))
    .orderBy(asc(customFields.createdAt))
}

const createOrgField = async ({
  organizationId,
  definition,
}: {
  organizationId: string
  definition: CreateDefinition
}) => {
  const [row] = await db
    .insert(customFields)
    .values({
      ...normalizeDefinition(definition),
      type: definition.type,
      organizationId,
      projectId: null,
    })
    .returning({ id: customFields.id })

  return { success: true as const, id: row?.id }
}

const assertTypeUnchanged = (storedType: string, submittedType: string) => {
  // The schema validates config/options/defaultValue against the submitted type,
  // but we persist against the stored type. Reject a mismatch so the client can't
  // write values incompatible with the actual field type.
  if (storedType !== submittedType) {
    throw new Error('Field type cannot be changed after creation')
  }
}

const updateOrgField = async ({
  organizationId,
  fieldId,
  definition,
}: {
  organizationId: string
  fieldId: string
  definition: UpdateDefinition
}) => {
  const scope = and(
    eq(customFields.id, fieldId),
    eq(customFields.organizationId, organizationId),
    isNull(customFields.projectId)
  )

  const [existing] = await db
    .select({ type: customFields.type })
    .from(customFields)
    .where(scope)
    .limit(1)

  if (!existing) {
    throw new Error('Custom field not found')
  }
  assertTypeUnchanged(existing.type, definition.type)

  const [updated] = await db
    .update(customFields)
    .set(normalizeDefinition(definition))
    .where(scope)
    .returning({ id: customFields.id })

  if (!updated) {
    throw new Error('Custom field not found')
  }

  return { success: true as const }
}

const deleteOrgField = async ({
  organizationId,
  fieldId,
}: {
  organizationId: string
  fieldId: string
}) => {
  const [deleted] = await db
    .delete(customFields)
    .where(
      and(
        eq(customFields.id, fieldId),
        eq(customFields.organizationId, organizationId),
        isNull(customFields.projectId)
      )
    )
    .returning({ id: customFields.id })

  if (!deleted) {
    throw new Error('Custom field not found')
  }

  return { success: true as const }
}

const createProjectField = async ({
  organizationId,
  projectId,
  definition,
}: {
  organizationId: string
  projectId: string
  definition: CreateDefinition
}) => {
  await projectAccess.assertInOrg(projectId, organizationId)

  const [row] = await db
    .insert(customFields)
    .values({
      ...normalizeDefinition(definition),
      type: definition.type,
      organizationId,
      projectId,
    })
    .returning({ id: customFields.id })

  return { success: true as const, id: row?.id }
}

const updateProjectField = async ({
  organizationId,
  projectId,
  fieldId,
  definition,
}: {
  organizationId: string
  projectId: string
  fieldId: string
  definition: UpdateDefinition
}) => {
  await projectAccess.assertInOrg(projectId, organizationId)

  const scope = and(
    eq(customFields.id, fieldId),
    eq(customFields.projectId, projectId),
    eq(customFields.organizationId, organizationId)
  )

  const [existing] = await db
    .select({ type: customFields.type })
    .from(customFields)
    .where(scope)
    .limit(1)

  if (!existing) {
    throw new Error('Custom field not found')
  }
  assertTypeUnchanged(existing.type, definition.type)

  const [updated] = await db
    .update(customFields)
    .set(normalizeDefinition(definition))
    .where(scope)
    .returning({ id: customFields.id })

  if (!updated) {
    throw new Error('Custom field not found')
  }

  return { success: true as const }
}

/**
 * Hard delete: removes the field definition and strips its key from every time
 * entry's `custom_values` in the same transaction (CONTEXT.md: cascading value
 * removal). The parent entry rows remain.
 */
const deleteProjectField = async ({
  organizationId,
  projectId,
  fieldId,
}: {
  organizationId: string
  projectId: string
  fieldId: string
}) => {
  await projectAccess.assertInOrg(projectId, organizationId)

  await db.transaction(async (tx) => {
    const [deleted] = await tx
      .delete(customFields)
      .where(
        and(
          eq(customFields.id, fieldId),
          eq(customFields.projectId, projectId),
          eq(customFields.organizationId, organizationId)
        )
      )
      .returning({ id: customFields.id })

    if (!deleted) {
      throw new Error('Custom field not found')
    }

    await tx
      .update(timeEntries)
      .set({
        customValues: sql`${timeEntries.customValues} - ${fieldId}::text`,
      })
      .where(eq(timeEntries.projectId, projectId))
  })

  return { success: true as const }
}

/**
 * Snapshots the org-level templates `fieldIds` into a project as fresh,
 * independent copies (CONTEXT.md: manual import). Returns how many were copied.
 */
const importFromOrg = async ({
  organizationId,
  projectId,
  fieldIds,
}: {
  organizationId: string
  projectId: string
  fieldIds: string[]
}) => {
  await projectAccess.assertInOrg(projectId, organizationId)

  const sources = await db
    .select(snapshotColumns)
    .from(customFields)
    .where(
      and(
        eq(customFields.organizationId, organizationId),
        isNull(customFields.projectId),
        inArray(customFields.id, fieldIds)
      )
    )

  if (sources.length === 0) {
    return { success: true as const, imported: 0 }
  }

  await db
    .insert(customFields)
    .values(sources.map((s) => ({ ...s, organizationId, projectId })))

  return { success: true as const, imported: sources.length }
}

/**
 * Copies the org's current templates into a freshly created project. Runs inside
 * the project-creation transaction (CONTEXT.md: hybrid auto-import). Each copy
 * gets a new ID and no live link to its org source.
 */
const copyOrgTemplatesToProject = async (
  tx: DbOrTx,
  organizationId: string,
  projectId: string
) => {
  const templates = await tx
    .select(snapshotColumns)
    .from(customFields)
    .where(
      and(
        eq(customFields.organizationId, organizationId),
        isNull(customFields.projectId)
      )
    )
    .orderBy(asc(customFields.createdAt))

  if (templates.length === 0) {
    return
  }

  await tx
    .insert(customFields)
    .values(templates.map((t) => ({ ...t, organizationId, projectId })))
}

export const customFieldsService = {
  getOrgFields,
  getProjectFields,
  createOrgField,
  updateOrgField,
  deleteOrgField,
  createProjectField,
  updateProjectField,
  deleteProjectField,
  importFromOrg,
  copyOrgTemplatesToProject,
}
