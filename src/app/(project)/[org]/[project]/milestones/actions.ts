'use server'

import { milestonesService } from '@/app/api/milestones/service'
import {
  orgScopedActionClient,
  projectScopedActionClient,
} from '@/lib/safe-action'
import {
  completeMilestoneSchema,
  createMilestoneSchema,
  deleteMilestoneSchema,
  linkRequirementSchema,
  reorderMilestonesSchema,
  unlinkRequirementSchema,
  updateMilestoneSchema,
} from './common'

export const createMilestoneAction = projectScopedActionClient
  .metadata({ authorize: { milestone: ['create'] } })
  .inputSchema(createMilestoneSchema)
  .action(({ parsedInput }) =>
    milestonesService.create({
      projectId: parsedInput.projectId,
      name: parsedInput.name,
      description: parsedInput.description,
      dueDate: parsedInput.dueDate,
      budgetMinutes: parsedInput.budgetMinutes,
      budgetAmountCents: parsedInput.budgetAmountCents,
      currency: parsedInput.currency,
    })
  )

export const updateMilestoneAction = orgScopedActionClient
  .metadata({ authorize: { milestone: ['update'] } })
  .inputSchema(updateMilestoneSchema)
  .action(({ parsedInput, ctx: { orgMember } }) =>
    milestonesService.update({
      milestoneId: parsedInput.milestoneId,
      orgMember,
      name: parsedInput.name,
      description: parsedInput.description,
      dueDate: parsedInput.dueDate,
      status: parsedInput.status,
      blockReason: parsedInput.blockReason,
      budgetMinutes: parsedInput.budgetMinutes,
      budgetAmountCents: parsedInput.budgetAmountCents,
    })
  )

export const deleteMilestoneAction = orgScopedActionClient
  .metadata({ authorize: { milestone: ['delete'] } })
  .inputSchema(deleteMilestoneSchema)
  .action(({ parsedInput: { milestoneId }, ctx: { orgMember } }) =>
    milestonesService.remove({ milestoneId, orgMember })
  )

export const completeMilestoneAction = orgScopedActionClient
  .metadata({ authorize: { milestone: ['complete'] } })
  .inputSchema(completeMilestoneSchema)
  .action(({ parsedInput: { milestoneId }, ctx: { orgMember } }) =>
    milestonesService.complete({ milestoneId, orgMember })
  )

export const reorderMilestonesAction = projectScopedActionClient
  .metadata({ authorize: { milestone: ['update'] } })
  .inputSchema(reorderMilestonesSchema)
  .action(({ parsedInput: { projectId, orderedIds } }) =>
    milestonesService.reorder({ projectId, orderedIds })
  )

export const linkRequirementAction = orgScopedActionClient
  .metadata({ authorize: { milestone: ['update'] } })
  .inputSchema(linkRequirementSchema)
  .action(
    ({ parsedInput: { milestoneId, requirementId }, ctx: { orgMember } }) =>
      milestonesService.linkRequirement({
        milestoneId,
        requirementId,
        orgMember,
      })
  )

export const unlinkRequirementAction = orgScopedActionClient
  .metadata({ authorize: { milestone: ['update'] } })
  .inputSchema(unlinkRequirementSchema)
  .action(
    ({ parsedInput: { milestoneId, requirementId }, ctx: { orgMember } }) =>
      milestonesService.unlinkRequirement({
        milestoneId,
        requirementId,
        orgMember,
      })
  )
