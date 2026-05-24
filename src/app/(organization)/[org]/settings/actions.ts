'use server'

import { and, eq, isNull, sql } from 'drizzle-orm'
import { headers } from 'next/headers'
import { authedActionClient } from '@/lib/safe-action'
import { auth } from '@/server/auth'
import { db } from '@/server/db'
import {
  customFields,
  projects as projectsTable,
  settings as settingsTable,
} from '@/server/db/schema'
import { organizations } from '@/server/db/schema/auth'
import {
  createOrgCustomFieldSchema,
  deleteOrganizationSchema,
  deleteOrgCustomFieldSchema,
  renameOrganizationSchema,
  updateInvoiceFromDetailsSchema,
  updateInvoiceImportDefaultsSchema,
  updateInvoiceNumberTemplateSchema,
  updateOrgClientInvolvementSchema,
  updateOrgCustomFieldSchema,
  updateTimesheetDefaultsSchema,
} from './common'

export const renameOrganizationAction = authedActionClient
  .inputSchema(renameOrganizationSchema)
  .action(
    async ({
      parsedInput: { organizationId, name, slug },
      ctx: { role, orgMember },
    }) => {
      if (!role.authorize({ organization: ['update'] }).success) {
        throw new Error(
          'You do not have permission to update workspace settings'
        )
      }

      if (orgMember.organizationId !== organizationId) {
        throw new Error('Organization mismatch')
      }

      await auth.api.updateOrganization({
        headers: await headers(),
        body: {
          data: { name, slug },
          organizationId,
        },
      })

      return { success: true, slug }
    }
  )

export const updateTimesheetDefaultsAction = authedActionClient
  .inputSchema(updateTimesheetDefaultsSchema)
  .action(
    async ({
      parsedInput: {
        organizationId,
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
        throw new Error(
          'You do not have permission to update workspace settings'
        )
      }

      if (orgMember.organizationId !== organizationId) {
        throw new Error('Organization mismatch')
      }
      try {
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
            ...defaults,
          })
          .onConflictDoUpdate({
            target: [settingsTable.organizationId],
            targetWhere: sql`${settingsTable.projectId} IS NULL`,
            set: defaults,
          })

        return { success: true }
      } catch (e) {
        console.error(e)
        return { success: false }
      }
    }
  )

export const updateInvoiceNumberTemplateAction = authedActionClient
  .inputSchema(updateInvoiceNumberTemplateSchema)
  .action(
    async ({
      parsedInput: { organizationId, projectId, invoiceNumberTemplate },
      ctx: { role, orgMember },
    }) => {
      if (!role.authorize({ organization: ['update'] }).success) {
        throw new Error(
          'You do not have permission to update workspace settings'
        )
      }

      if (orgMember.organizationId !== organizationId) {
        throw new Error('Organization mismatch')
      }

      if (projectId) {
        await db
          .insert(settingsTable)
          .values({
            organizationId,
            projectId,
            invoiceNumberTemplate,
          })
          .onConflictDoUpdate({
            target: [settingsTable.organizationId, settingsTable.projectId],
            set: { invoiceNumberTemplate },
          })
      } else {
        await db
          .insert(settingsTable)
          .values({
            organizationId,
            invoiceNumberTemplate,
          })
          .onConflictDoUpdate({
            target: [settingsTable.organizationId],
            targetWhere: sql`${settingsTable.projectId} IS NULL`,
            set: { invoiceNumberTemplate },
          })
      }

      return { success: true }
    }
  )

export const updateInvoiceImportDefaultsAction = authedActionClient
  .inputSchema(updateInvoiceImportDefaultsSchema)
  .action(
    async ({
      parsedInput: { organizationId, projectId, invoiceTimeUnit },
      ctx: { role, orgMember },
    }) => {
      if (!role.authorize({ organization: ['update'] }).success) {
        throw new Error(
          'You do not have permission to update workspace settings'
        )
      }

      if (orgMember.organizationId !== organizationId) {
        throw new Error('Organization mismatch')
      }

      if (projectId) {
        const [project] = await db
          .select({ id: projectsTable.id })
          .from(projectsTable)
          .where(
            and(
              eq(projectsTable.id, projectId),
              eq(projectsTable.organizationId, organizationId)
            )
          )
          .limit(1)

        if (!project) {
          throw new Error('Project does not belong to this organization')
        }

        await db
          .insert(settingsTable)
          .values({
            organizationId,
            projectId,
            invoiceTimeUnit,
          })
          .onConflictDoUpdate({
            target: [settingsTable.organizationId, settingsTable.projectId],
            set: { invoiceTimeUnit },
          })
      } else {
        await db
          .insert(settingsTable)
          .values({
            organizationId,
            invoiceTimeUnit,
          })
          .onConflictDoUpdate({
            target: [settingsTable.organizationId],
            targetWhere: sql`${settingsTable.projectId} IS NULL`,
            set: { invoiceTimeUnit },
          })
      }

      return { success: true }
    }
  )

export const updateInvoiceFromDetailsAction = authedActionClient
  .inputSchema(updateInvoiceFromDetailsSchema)
  .action(
    async ({
      parsedInput: { organizationId, invoiceFromName, invoiceFromAddress },
      ctx: { role, orgMember },
    }) => {
      if (!role.authorize({ organization: ['update'] }).success) {
        throw new Error(
          'You do not have permission to update workspace settings'
        )
      }

      if (orgMember.organizationId !== organizationId) {
        throw new Error('Organization mismatch')
      }

      const fromName = invoiceFromName?.trim() || null
      const fromAddress = invoiceFromAddress?.trim() || null

      await db
        .insert(settingsTable)
        .values({
          organizationId,
          invoiceFromName: fromName,
          invoiceFromAddress: fromAddress,
        })
        .onConflictDoUpdate({
          target: [settingsTable.organizationId],
          targetWhere: sql`${settingsTable.projectId} IS NULL`,
          set: {
            invoiceFromName: fromName,
            invoiceFromAddress: fromAddress,
          },
        })

      return { success: true }
    }
  )

export const updateOrgClientInvolvementAction = authedActionClient
  .inputSchema(updateOrgClientInvolvementSchema)
  .action(
    async ({
      parsedInput: { organizationId, clientInvolvement },
      ctx: { role, orgMember },
    }) => {
      if (!role.authorize({ organization: ['update'] }).success) {
        throw new Error(
          'You do not have permission to update workspace settings'
        )
      }
      if (orgMember.organizationId !== organizationId) {
        throw new Error('Organization mismatch')
      }

      await db
        .insert(settingsTable)
        .values({ organizationId, clientInvolvement })
        .onConflictDoUpdate({
          target: [settingsTable.organizationId],
          targetWhere: sql`${settingsTable.projectId} IS NULL`,
          set: { clientInvolvement },
        })

      return { success: true }
    }
  )

export const createOrgCustomFieldAction = authedActionClient
  .inputSchema(createOrgCustomFieldSchema)
  .action(
    async ({
      parsedInput: { organizationId, definition },
      ctx: { role, orgMember },
    }) => {
      if (!role.authorize({ organization: ['update'] }).success) {
        throw new Error(
          'You do not have permission to update workspace settings'
        )
      }
      if (orgMember.organizationId !== organizationId) {
        throw new Error('Organization mismatch')
      }

      const [row] = await db
        .insert(customFields)
        .values({
          ...definition,
          organizationId,
          projectId: null,
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

export const updateOrgCustomFieldAction = authedActionClient
  .inputSchema(updateOrgCustomFieldSchema)
  .action(
    async ({
      parsedInput: { organizationId, fieldId, definition },
      ctx: { role, orgMember },
    }) => {
      if (!role.authorize({ organization: ['update'] }).success) {
        throw new Error(
          'You do not have permission to update this custom field'
        )
      }
      if (orgMember.organizationId !== organizationId) {
        throw new Error(
          'This custom field belongs to a different workspace than the one you have selected'
        )
      }

      const [existing] = await db
        .select({ type: customFields.type })
        .from(customFields)
        .where(
          and(
            eq(customFields.id, fieldId),
            eq(customFields.organizationId, organizationId),
            isNull(customFields.projectId)
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
            eq(customFields.organizationId, organizationId),
            isNull(customFields.projectId)
          )
        )
        .returning({ id: customFields.id })

      if (!updated) {
        throw new Error('Custom field not found')
      }

      return { success: true }
    }
  )

export const deleteOrgCustomFieldAction = authedActionClient
  .inputSchema(deleteOrgCustomFieldSchema)
  .action(
    async ({
      parsedInput: { organizationId, fieldId },
      ctx: { role, orgMember },
    }) => {
      if (!role.authorize({ organization: ['update'] }).success) {
        throw new Error(
          'You do not have permission to update workspace settings'
        )
      }
      if (orgMember.organizationId !== organizationId) {
        throw new Error('Organization mismatch')
      }

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

      return { success: true }
    }
  )

export const deleteOrganizationAction = authedActionClient
  .inputSchema(deleteOrganizationSchema)
  .action(
    async ({
      parsedInput: { organizationId, confirmName },
      ctx: { role, orgMember },
    }) => {
      if (!role.authorize({ organization: ['delete'] }).success) {
        throw new Error('You do not have permission to delete this workspace')
      }

      if (orgMember.organizationId !== organizationId) {
        throw new Error('Organization mismatch')
      }

      const [org] = await db
        .select({ name: organizations.name })
        .from(organizations)
        .where(eq(organizations.id, organizationId))

      if (!org) {
        throw new Error('Workspace not found')
      }

      if (org.name !== confirmName) {
        throw new Error('Workspace name does not match')
      }

      await auth.api.deleteOrganization({
        headers: await headers(),
        body: { organizationId },
      })

      return { success: true }
    }
  )
