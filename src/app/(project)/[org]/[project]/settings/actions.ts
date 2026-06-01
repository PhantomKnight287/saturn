'use server'

import { and, eq, inArray, isNull, sql } from 'drizzle-orm'
import { projectsService } from '@/app/api/projects/service'
import { orgScopedActionClient } from '@/lib/safe-action'
import { db } from '@/server/db'
import { customFields, timeEntries } from '@/server/db/schema'
import { projects } from '@/server/db/schema/project'
import {
  clientInvolvementProjectSchema,
  createProjectCustomFieldSchema,
  deleteProjectCustomFieldSchema,
  deleteProjectSchema,
  importOrgCustomFieldsSchema,
  renameProjectSchema,
  updateProjectBillingDetailsSchema,
  updateProjectCustomFieldSchema,
  updateProjectStatusSchema,
  updateProjectTimesheetDefaultsSchema,
} from './common'

export const renameProjectAction = orgScopedActionClient
  .metadata({ authorize: { organization: ['update'] } })
  .inputSchema(renameProjectSchema)
  .action(
    ({ parsedInput: { projectId, organizationId, name, slug, dueDate } }) =>
      projectsService.rename({ projectId, organizationId, name, slug, dueDate })
  )

export const updateProjectTimesheetDefaultsAction = orgScopedActionClient
  .metadata({ authorize: { organization: ['update'] } })
  .inputSchema(updateProjectTimesheetDefaultsSchema)
  .action(({ parsedInput }) =>
    projectsService.updateProjectTimesheetDefaults(parsedInput)
  )

export const updateProjectBillingDetailsAction = orgScopedActionClient
  .metadata({ authorize: { organization: ['update'] } })
  .inputSchema(updateProjectBillingDetailsSchema)
  .action(({ parsedInput }) =>
    projectsService.updateProjectBillingDetails(parsedInput)
  )

export const updateProjectStatusAction = orgScopedActionClient
  .metadata({ authorize: { organization: ['update'] } })
  .inputSchema(updateProjectStatusSchema)
  .action(
    ({ parsedInput: { projectId, organizationId, status }, ctx: { role } }) => {
      if (!role.authorize({ organization: ['update'] }).success) {
        throw new Error('You do not have permission to update project status')
      }
      return projectsService.updateStatus({ projectId, organizationId, status })
    }
  )

export const deleteProjectAction = orgScopedActionClient
  .metadata({ authorize: { organization: ['delete'] } })
  .inputSchema(deleteProjectSchema)
  .action(({ parsedInput: { projectId, organizationId, confirmName } }) =>
    projectsService.remove({ projectId, organizationId, confirmName })
  )

async function assertProjectInOrg(projectId: string, organizationId: string) {
  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(
      and(
        eq(projects.id, projectId),
        eq(projects.organizationId, organizationId)
      )
    )
    .limit(1)
  if (!project) {
    throw new Error('Project not found in this workspace')
  }
}

export const createProjectCustomFieldAction = orgScopedActionClient
  .metadata({ authorize: { project: ['update'] } })
  .inputSchema(createProjectCustomFieldSchema)
  .action(
    async ({
      parsedInput: { organizationId, projectId, definition },
      ctx: { orgMember },
    }) => {
      if (orgMember.organizationId !== organizationId) {
        throw new Error(
          'This project belongs to a different workspace than the one you have selected'
        )
      }
      await assertProjectInOrg(projectId, organizationId)

      const [row] = await db
        .insert(customFields)
        .values({
          ...definition,
          organizationId,
          projectId,
          required: definition.required ?? false,
          visibleToClient: definition.visibleToClient ?? false,
          defaultValue: definition.defaultValue ?? null,
          options: definition.options ?? null,
          config: definition.config ?? null,
        })
        .returning({ id: customFields.id })

      return { success: true, id: row?.id }
    }
  )

export const updateProjectCustomFieldAction = orgScopedActionClient
  .metadata({ authorize: { project: ['update'] } })
  .inputSchema(updateProjectCustomFieldSchema)
  .action(
    async ({
      parsedInput: { organizationId, projectId, fieldId, definition },
      ctx: { orgMember },
    }) => {
      if (orgMember.organizationId !== organizationId) {
        throw new Error(
          'This project belongs to a different workspace than the one you have selected'
        )
      }
      await assertProjectInOrg(projectId, organizationId)

      const [existing] = await db
        .select({ type: customFields.type })
        .from(customFields)
        .where(
          and(
            eq(customFields.id, fieldId),
            eq(customFields.projectId, projectId),
            eq(customFields.organizationId, organizationId)
          )
        )
        .limit(1)

      if (!existing) {
        throw new Error('Custom field not found')
      }
      // The schema validates config/options/defaultValue against the submitted
      // type, but we persist against the stored type. Reject a mismatch so the
      // client can't write values incompatible with the actual field type.
      if (existing.type !== definition.type) {
        throw new Error('Field type cannot be changed after creation')
      }

      const { type: _ignored, ...mutable } = definition
      const [updated] = await db
        .update(customFields)
        .set({
          ...mutable,
          defaultValue: definition.defaultValue ?? null,
          options: definition.options ?? null,
          config: definition.config ?? null,
        })
        .where(
          and(
            eq(customFields.id, fieldId),
            eq(customFields.projectId, projectId),
            eq(customFields.organizationId, organizationId)
          )
        )
        .returning({ id: customFields.id })

      if (!updated) {
        throw new Error('Custom field not found')
      }

      return { success: true }
    }
  )

export const deleteProjectCustomFieldAction = orgScopedActionClient
  .metadata({ authorize: { project: ['update'] } })
  .inputSchema(deleteProjectCustomFieldSchema)
  .action(
    async ({
      parsedInput: { organizationId, projectId, fieldId },
      ctx: { orgMember },
    }) => {
      if (orgMember.organizationId !== organizationId) {
        throw new Error(
          'This project belongs to a different workspace than the one you have selected'
        )
      }
      await assertProjectInOrg(projectId, organizationId)

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

      return { success: true }
    }
  )

export const importOrgCustomFieldsAction = orgScopedActionClient
  .metadata({ authorize: { project: ['update'] } })
  .inputSchema(importOrgCustomFieldsSchema)
  .action(
    async ({
      parsedInput: { organizationId, projectId, fieldIds },
      ctx: { orgMember },
    }) => {
      if (orgMember.organizationId !== organizationId) {
        throw new Error(
          'This project belongs to a different workspace than the one you have selected'
        )
      }
      await assertProjectInOrg(projectId, organizationId)

      const sources = await db
        .select({
          label: customFields.label,
          type: customFields.type,
          required: customFields.required,
          visibleToClient: customFields.visibleToClient,
          defaultValue: customFields.defaultValue,
          options: customFields.options,
          config: customFields.config,
        })
        .from(customFields)
        .where(
          and(
            eq(customFields.organizationId, organizationId),
            isNull(customFields.projectId),
            inArray(customFields.id, fieldIds)
          )
        )

      if (sources.length === 0) {
        return { success: true, imported: 0 }
      }

      await db.insert(customFields).values(
        sources.map((s) => ({
          ...s,
          organizationId,
          projectId,
        }))
      )

      return { success: true, imported: sources.length }
    }
  )

export const updateClientInvolvementLevelAction = orgScopedActionClient
  .metadata({ authorize: { organization: ['update'] } })
  .inputSchema(clientInvolvementProjectSchema)
  .action(({ parsedInput: { clientInvolvement, organizationId, projectId } }) =>
    projectsService.updateProjectClientInvolvement({
      organizationId,
      projectId,
      clientInvolvement,
    })
  )
