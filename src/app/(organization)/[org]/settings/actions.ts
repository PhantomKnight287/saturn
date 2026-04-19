'use server'

import { eq, sql } from 'drizzle-orm'
import { headers } from 'next/headers'
import { authedActionClient } from '@/lib/safe-action'
import { auth } from '@/server/auth'
import { db } from '@/server/db'
import { settings as settingsTable } from '@/server/db/schema'
import { organizations } from '@/server/db/schema/auth'
import {
  deleteOrganizationSchema,
  renameOrganizationSchema,
  updateInvoiceNumberTemplateSchema,
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
            defaultMemberRate,
            defaultCurrency,
            defaultTimesheetDuration,
          })
          .onConflictDoUpdate({
            target: [settingsTable.organizationId],
            targetWhere: sql`${settingsTable.projectId} IS NULL`,
            set: {
              defaultMemberRate,
              defaultCurrency,
              defaultTimesheetDuration,
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
