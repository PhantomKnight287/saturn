'use server'

import { and, eq, inArray, isNull, sql } from 'drizzle-orm'
import { authedActionClient } from '@/lib/safe-action'
import { db } from '@/server/db'
import {
  customFields,
  settings as settingsTable,
  timeEntries,
} from '@/server/db/schema'
import { projects } from '@/server/db/schema/project'
import {
  clientInvolvementProjectSchema,
  createProjectCustomFieldSchema,
  deleteProjectCustomFieldSchema,
  deleteProjectSchema,
  importOrgCustomFieldsSchema,
  renameProjectSchema,
  updateProjectCustomFieldSchema,
  updateProjectStatusSchema,
  updateProjectTimesheetDefaultsSchema,
} from './common'

export const renameProjectAction = authedActionClient
  .inputSchema(renameProjectSchema)
  .action(
    async ({
      parsedInput: { projectId, organizationId, name, slug, dueDate },
      ctx: { role, orgMember },
    }) => {
      if (!role.authorize({ organization: ['update'] }).success) {
        throw new Error('You do not have permission to update project settings')
      }

      if (orgMember.organizationId !== organizationId) {
        throw new Error('Organization mismatch')
      }

      await db
        .update(projects)
        .set({ name, slug, dueDate: dueDate ?? null })
        .where(
          and(
            eq(projects.id, projectId),
            eq(projects.organizationId, organizationId)
          )
        )

      return { success: true, slug }
    }
  )

export const updateProjectTimesheetDefaultsAction = authedActionClient
  .inputSchema(updateProjectTimesheetDefaultsSchema)
  .action(
    async ({
      parsedInput: {
        organizationId,
        projectId,
        defaultMemberRate,
        defaultCurrency,
        defaultTimesheetDuration,
      },
      ctx: { role, orgMember },
    }) => {
      if (!role.authorize({ organization: ['update'] }).success) {
        throw new Error('You do not have permission to update project settings')
      }

      if (orgMember.organizationId !== organizationId) {
        throw new Error('Organization mismatch')
      }

      await db
        .insert(settingsTable)
        .values({
          organizationId,
          projectId,
          memberRate: defaultMemberRate,
          currency: defaultCurrency,
          timesheetDuration: defaultTimesheetDuration,
        })
        .onConflictDoUpdate({
          target: [settingsTable.organizationId, settingsTable.projectId],
          set: {
            memberRate: defaultMemberRate,
            currency: defaultCurrency,
            timesheetDuration: defaultTimesheetDuration,
          },
        })

      return { success: true }
    }
  )

export const updateProjectStatusAction = authedActionClient
  .inputSchema(updateProjectStatusSchema)
  .action(
    async ({
      parsedInput: { projectId, organizationId, status },
      ctx: { role, orgMember },
    }) => {
      if (!role.authorize({ organization: ['update'] }).success) {
        throw new Error('You do not have permission to update project status')
      }

      if (orgMember.organizationId !== organizationId) {
        throw new Error('Organization mismatch')
      }

      await db
        .update(projects)
        .set({ status })
        .where(
          and(
            eq(projects.id, projectId),
            eq(projects.organizationId, organizationId)
          )
        )

      return { success: true, status }
    }
  )

export const deleteProjectAction = authedActionClient
  .inputSchema(deleteProjectSchema)
  .action(
    async ({
      parsedInput: { projectId, organizationId, confirmName },
      ctx: { role, orgMember },
    }) => {
      if (!role.authorize({ organization: ['delete'] }).success) {
        throw new Error('You do not have permission to delete this project')
      }

      if (orgMember.organizationId !== organizationId) {
        throw new Error('Organization mismatch')
      }

      const [project] = await db
        .select({ name: projects.name })
        .from(projects)
        .where(
          and(
            eq(projects.id, projectId),
            eq(projects.organizationId, organizationId)
          )
        )

      if (!project) {
        throw new Error('Project not found')
      }

      if (project.name !== confirmName) {
        throw new Error('Project name does not match')
      }

      await db
        .delete(projects)
        .where(
          and(
            eq(projects.id, projectId),
            eq(projects.organizationId, organizationId)
          )
        )

      return { success: true }
    }
  )

export const createProjectCustomFieldAction = authedActionClient
  .inputSchema(createProjectCustomFieldSchema)
  .action(
    async ({
      parsedInput: { organizationId, projectId, definition },
      ctx: { role, orgMember },
    }) => {
      if (!role.authorize({ project: ['update'] }).success) {
        throw new Error('You do not have permission to update project settings')
      }
      if (orgMember.organizationId !== organizationId) {
        throw new Error('Organization mismatch')
      }

      const [row] = await db
        .insert(customFields)
        .values({
          organizationId,
          projectId,
          label: definition.label,
          type: definition.type,
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

export const updateProjectCustomFieldAction = authedActionClient
  .inputSchema(updateProjectCustomFieldSchema)
  .action(
    async ({
      parsedInput: { organizationId, projectId, fieldId, definition },
      ctx: { role, orgMember },
    }) => {
      if (!role.authorize({ project: ['update'] }).success) {
        throw new Error('You do not have permission to update project settings')
      }
      if (orgMember.organizationId !== organizationId) {
        throw new Error('Organization mismatch')
      }

      await db
        .update(customFields)
        .set({
          label: definition.label,
          required: definition.required,
          visibleToClient: definition.visibleToClient,
          defaultValue: definition.defaultValue ?? null,
          options: definition.options ?? null,
          config: definition.config ?? null,
        })
        .where(
          and(
            eq(customFields.id, fieldId),
            eq(customFields.projectId, projectId)
          )
        )

      return { success: true }
    }
  )

export const deleteProjectCustomFieldAction = authedActionClient
  .inputSchema(deleteProjectCustomFieldSchema)
  .action(
    async ({
      parsedInput: { organizationId, projectId, fieldId },
      ctx: { role, orgMember },
    }) => {
      if (!role.authorize({ project: ['update'] }).success) {
        throw new Error('You do not have permission to update project settings')
      }
      if (orgMember.organizationId !== organizationId) {
        throw new Error('Organization mismatch')
      }

      await db.transaction(async (tx) => {
        await tx
          .delete(customFields)
          .where(
            and(
              eq(customFields.id, fieldId),
              eq(customFields.projectId, projectId)
            )
          )
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

export const importOrgCustomFieldsAction = authedActionClient
  .inputSchema(importOrgCustomFieldsSchema)
  .action(
    async ({
      parsedInput: { organizationId, projectId, fieldIds },
      ctx: { role, orgMember },
    }) => {
      if (!role.authorize({ project: ['update'] }).success) {
        throw new Error('You do not have permission to update project settings')
      }
      if (orgMember.organizationId !== organizationId) {
        throw new Error('Organization mismatch')
      }

      const sources = await db
        .select()
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
          organizationId,
          projectId,
          label: s.label,
          type: s.type,
          required: s.required,
          visibleToClient: s.visibleToClient,
          defaultValue: s.defaultValue,
          options: s.options,
          config: s.config,
        }))
      )

      return { success: true, imported: sources.length }
    }
  )

export const updateClientInvolvementLevelAction = authedActionClient
  .inputSchema(clientInvolvementProjectSchema)
  .action(
    async ({
      parsedInput: { clientInvolvement, organizationId, projectId },
      ctx: { role, orgMember },
    }) => {
      if (!role.authorize({ organization: ['update'] }).success) {
        throw new Error('You do not have permission to update project settings')
      }

      if (orgMember.organizationId !== organizationId) {
        throw new Error('Organization mismatch')
      }

      const [project] = await db
        .select({ name: projects.name })
        .from(projects)
        .where(
          and(
            eq(projects.id, projectId),
            eq(projects.organizationId, organizationId)
          )
        )

      if (!project) {
        throw new Error('Project not found')
      }
      await db
        .insert(settingsTable)
        .values({
          organizationId,
          projectId,
          clientInvolvement,
        })
        .onConflictDoUpdate({
          target: [settingsTable.organizationId, settingsTable.projectId],
          set: {
            clientInvolvement,
          },
        })

      return { success: true }
    }
  )
