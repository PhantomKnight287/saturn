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
  updateProjectBillingDetailsSchema,
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
        defaultPayRate,
        defaultPayCurrency,
        defaultPayFrequency,
        defaultBillingRate,
        defaultBillingCurrency,
        defaultBillingFrequency,
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

      const defaults = {
        payRate: defaultPayRate,
        payCurrency: defaultPayCurrency,
        payFrequency: defaultPayFrequency,
        billingRate: defaultBillingRate ?? defaultPayRate,
        billingCurrency: defaultBillingCurrency ?? defaultPayCurrency,
        billingFrequency: defaultBillingFrequency ?? defaultPayFrequency,
        timesheetDuration: defaultTimesheetDuration,
      }
      await db
        .insert(settingsTable)
        .values({
          organizationId,
          projectId,
          ...defaults,
        })
        .onConflictDoUpdate({
          target: [settingsTable.organizationId, settingsTable.projectId],
          set: defaults,
        })

      return { success: true }
    }
  )

export const updateProjectBillingDetailsAction = authedActionClient
  .inputSchema(updateProjectBillingDetailsSchema)
  .action(
    async ({
      parsedInput: {
        organizationId,
        projectId,
        invoiceFromName,
        invoiceFromAddress,
        invoiceToName,
        invoiceToAddress,
      },
      ctx: { role, orgMember },
    }) => {
      if (!role.authorize({ organization: ['update'] }).success) {
        throw new Error('You do not have permission to update project settings')
      }

      if (orgMember.organizationId !== organizationId) {
        throw new Error('Organization mismatch')
      }

      await assertProjectInOrg(projectId, organizationId)

      const fromName = invoiceFromName?.trim() || null
      const fromAddress = invoiceFromAddress?.trim() || null
      const toName = invoiceToName?.trim() || null
      const toAddress = invoiceToAddress?.trim() || null

      await db
        .insert(settingsTable)
        .values({
          organizationId,
          projectId,
          invoiceFromName: fromName,
          invoiceFromAddress: fromAddress,
          invoiceToName: toName,
          invoiceToAddress: toAddress,
        })
        .onConflictDoUpdate({
          target: [settingsTable.organizationId, settingsTable.projectId],
          set: {
            invoiceFromName: fromName,
            invoiceFromAddress: fromAddress,
            invoiceToName: toName,
            invoiceToAddress: toAddress,
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
