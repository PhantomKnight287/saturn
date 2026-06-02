'use server'

import { projectsService } from '@/app/api/projects/service'
import { orgScopedActionClient } from '@/lib/safe-action'
import { customFieldsService } from '@/server/custom-fields/service'
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
  .action(({ parsedInput: { projectId, organizationId, status } }) =>
    projectsService.updateStatus({ projectId, organizationId, status })
  )

export const deleteProjectAction = orgScopedActionClient
  .metadata({ authorize: { organization: ['delete'] } })
  .inputSchema(deleteProjectSchema)
  .action(({ parsedInput: { projectId, organizationId, confirmName } }) =>
    projectsService.remove({ projectId, organizationId, confirmName })
  )

export const createProjectCustomFieldAction = orgScopedActionClient
  .metadata({ authorize: { project: ['update'] } })
  .inputSchema(createProjectCustomFieldSchema)
  .action(({ parsedInput }) =>
    customFieldsService.createProjectField(parsedInput)
  )

export const updateProjectCustomFieldAction = orgScopedActionClient
  .metadata({ authorize: { project: ['update'] } })
  .inputSchema(updateProjectCustomFieldSchema)
  .action(({ parsedInput }) =>
    customFieldsService.updateProjectField(parsedInput)
  )

export const deleteProjectCustomFieldAction = orgScopedActionClient
  .metadata({ authorize: { project: ['update'] } })
  .inputSchema(deleteProjectCustomFieldSchema)
  .action(({ parsedInput }) =>
    customFieldsService.deleteProjectField(parsedInput)
  )

export const importOrgCustomFieldsAction = orgScopedActionClient
  .metadata({ authorize: { project: ['update'] } })
  .inputSchema(importOrgCustomFieldsSchema)
  .action(({ parsedInput }) => customFieldsService.importFromOrg(parsedInput))

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
