'use server'

import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { projectsService } from '@/app/api/projects/service'
import { orgScopedActionClient } from '@/lib/safe-action'
import { auth } from '@/server/auth'
import { customFieldsService } from '@/server/custom-fields/service'
import { db } from '@/server/db'
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
  .action(async ({ parsedInput: { organizationId, name, slug } }) => {
    await auth.api.updateOrganization({
      headers: await headers(),
      body: {
        data: { name, slug },
        organizationId,
      },
    })

    return { success: true, slug }
  })

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
  .action(({ parsedInput }) => customFieldsService.createOrgField(parsedInput))

export const updateOrgCustomFieldAction = orgScopedActionClient
  .metadata({ authorize: { organization: ['update'] } })
  .inputSchema(updateOrgCustomFieldSchema)
  .action(({ parsedInput }) => customFieldsService.updateOrgField(parsedInput))

export const deleteOrgCustomFieldAction = orgScopedActionClient
  .metadata({ authorize: { organization: ['update'] } })
  .inputSchema(deleteOrgCustomFieldSchema)
  .action(({ parsedInput }) => customFieldsService.deleteOrgField(parsedInput))

export const deleteOrganizationAction = orgScopedActionClient
  .metadata({ authorize: { organization: ['delete'] } })
  .inputSchema(deleteOrganizationSchema)
  .action(async ({ parsedInput: { organizationId, confirmName } }) => {
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
  })
