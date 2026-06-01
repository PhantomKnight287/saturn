'use server'

import { and, eq, isNull } from 'drizzle-orm'
import { headers } from 'next/headers'
import { projectsService } from '@/app/api/projects/service'
import { orgScopedActionClient } from '@/lib/safe-action'
import { auth } from '@/server/auth'
import { db } from '@/server/db'
import { customFields } from '@/server/db/schema'
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

export const renameOrganizationAction = orgScopedActionClient
  .metadata({ authorize: { organization: ['update'] } })
  .inputSchema(renameOrganizationSchema)
  .action(
    async ({
      parsedInput: { organizationId, name, slug },
      ctx: { orgMember },
    }) => {
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

export const updateTimesheetDefaultsAction = orgScopedActionClient
  .metadata({ authorize: { organization: ['update'] } })
  .inputSchema(updateTimesheetDefaultsSchema)
  .action(({ parsedInput }) =>
    projectsService.updateOrgTimesheetDefaults(parsedInput)
  )

export const updateInvoiceNumberTemplateAction = orgScopedActionClient
  .metadata({ authorize: { organization: ['update'] } })
  .inputSchema(updateInvoiceNumberTemplateSchema)
  .action(({ parsedInput }) =>
    projectsService.updateInvoiceNumberTemplate(parsedInput)
  )

export const updateInvoiceImportDefaultsAction = orgScopedActionClient
  .metadata({ authorize: { organization: ['update'] } })
  .inputSchema(updateInvoiceImportDefaultsSchema)
  .action(({ parsedInput }) =>
    projectsService.updateInvoiceImportDefaults(parsedInput)
  )

export const updateInvoiceFromDetailsAction = orgScopedActionClient
  .metadata({ authorize: { organization: ['update'] } })
  .inputSchema(updateInvoiceFromDetailsSchema)
  .action(({ parsedInput }) =>
    projectsService.updateInvoiceFromDetails(parsedInput)
  )

export const updateOrgClientInvolvementAction = orgScopedActionClient
  .metadata({ authorize: { organization: ['update'] } })
  .inputSchema(updateOrgClientInvolvementSchema)
  .action(({ parsedInput }) =>
    projectsService.updateOrgClientInvolvement(parsedInput)
  )

export const createOrgCustomFieldAction = orgScopedActionClient
  .metadata({ authorize: { organization: ['update'] } })
  .inputSchema(createOrgCustomFieldSchema)
  .action(
    async ({
      parsedInput: { organizationId, definition },
      ctx: { orgMember },
    }) => {
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

export const updateOrgCustomFieldAction = orgScopedActionClient
  .metadata({ authorize: { organization: ['update'] } })
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

export const deleteOrgCustomFieldAction = orgScopedActionClient
  .metadata({ authorize: { organization: ['update'] } })
  .inputSchema(deleteOrgCustomFieldSchema)
  .action(
    async ({
      parsedInput: { organizationId, fieldId },
      ctx: { orgMember },
    }) => {
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

export const deleteOrganizationAction = orgScopedActionClient
  .metadata({ authorize: { organization: ['delete'] } })
  .inputSchema(deleteOrganizationSchema)
  .action(
    async ({
      parsedInput: { organizationId, confirmName },
      ctx: { orgMember },
    }) => {
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
