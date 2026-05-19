'use server'

import { and, eq, isNull, sql } from 'drizzle-orm'
import { headers } from 'next/headers'
import { authedActionClient } from '@/lib/safe-action'
import { auth } from '@/server/auth'
import { db } from '@/server/db'
import { customFields, settings as settingsTable } from '@/server/db/schema'
import { organizations } from '@/server/db/schema/auth'
import {
  createOrgCustomFieldSchema,
  deleteOrganizationSchema,
  deleteOrgCustomFieldSchema,
  renameOrganizationSchema,
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
        defaultMemberRate,
        defaultCurrency,
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
        await db
          .insert(settingsTable)
          .values({
            organizationId,
            memberRate: defaultMemberRate,
            currency: defaultCurrency,
            timesheetDuration: defaultTimesheetDuration,
          })
          .onConflictDoUpdate({
            target: [settingsTable.organizationId],
            targetWhere: sql`${settingsTable.projectId} IS NULL`,
            set: {
              memberRate: defaultMemberRate,
              currency: defaultCurrency,
              timesheetDuration: defaultTimesheetDuration,
            },
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

      const { type: _ignored, ...mutable } = definition
      await db
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

      await db
        .delete(customFields)
        .where(
          and(
            eq(customFields.id, fieldId),
            eq(customFields.organizationId, organizationId),
            isNull(customFields.projectId)
          )
        )

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
