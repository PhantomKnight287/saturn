'use server'

import { projectsService } from '@/app/api/projects/service'
import { orgScopedActionClient } from '@/lib/safe-action'
import { createProjectSchema } from './common'

export const createProjectAction = orgScopedActionClient
  .metadata({ authorize: { project: ['create'] } })
  .inputSchema(createProjectSchema)
  .action(({ parsedInput, ctx: { orgMember } }) =>
    projectsService.create({
      organizationId: parsedInput.organizationId,
      authorId: orgMember.id,
      name: parsedInput.name,
      description: parsedInput.description,
      dueDate: parsedInput.dueDate,
      invoiceFromName: parsedInput.invoiceFromName,
      invoiceFromAddress: parsedInput.invoiceFromAddress,
      invoiceToName: parsedInput.invoiceToName,
      invoiceToAddress: parsedInput.invoiceToAddress,
    })
  )
