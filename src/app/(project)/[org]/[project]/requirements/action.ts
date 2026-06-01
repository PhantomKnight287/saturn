'use server'

import { requirementsService } from '@/app/api/requirements/service'
import { projectScopedActionClient } from '@/lib/safe-action'
import {
  addThreadReplySchema,
  createRequirementSchema,
  createThreadSchema,
  requestChangesSchema,
  resolveChangeRequestSchema,
  sendForSignSchema,
  signRequirementSchema,
  updateRequirementSchema,
} from './common'

export const createRequirementAction = projectScopedActionClient
  .metadata({ authorize: { requirement: ['create'] } })
  .inputSchema(createRequirementSchema)
  .action(({ parsedInput, ctx }) =>
    requirementsService.create({
      project: ctx.project,
      authorId: ctx.orgMember.id,
      title: parsedInput.title,
      body: parsedInput.body,
    })
  )

export const updateRequirementAction = projectScopedActionClient
  .metadata({ authorize: { requirement: ['update'] } })
  .inputSchema(updateRequirementSchema)
  .action(({ parsedInput, ctx }) =>
    requirementsService.update({
      project: ctx.project,
      orgMember: ctx.orgMember,
      requirementId: parsedInput.requirementId,
      title: parsedInput.title,
      body: parsedInput.body,
    })
  )

export const sendForSignAction = projectScopedActionClient
  .metadata({ authorize: { requirement: ['send_for_sign'] } })
  .inputSchema(sendForSignSchema)
  .action(({ parsedInput, ctx }) =>
    requirementsService.sendForSign({
      project: ctx.project,
      orgMember: ctx.orgMember,
      orgSlug: parsedInput.orgSlug,
      requirementId: parsedInput.requirementId,
      recipients: parsedInput.recipients,
    })
  )

export const signRequirementAction = projectScopedActionClient
  .metadata({})
  .inputSchema(signRequirementSchema)
  .action(({ parsedInput, ctx }) =>
    requirementsService.sign({
      project: ctx.project,
      orgMember: ctx.orgMember,
      orgSlug: parsedInput.orgSlug,
      requirementId: parsedInput.requirementId,
      mediaId: parsedInput.mediaId,
    })
  )

export const createThreadAction = projectScopedActionClient
  .metadata({ authorize: { thread: ['create'] } })
  .inputSchema(createThreadSchema)
  .action(({ parsedInput, ctx }) =>
    requirementsService.createThread({
      project: ctx.project,
      orgMember: ctx.orgMember,
      orgSlug: parsedInput.orgSlug,
      requirementId: parsedInput.requirementId,
      selectedText: parsedInput.selectedText,
      threadBody: parsedInput.threadBody,
    })
  )

export const requestChangesAction = projectScopedActionClient
  .metadata({ authorize: { requirement: ['request_changes'] } })
  .inputSchema(requestChangesSchema)
  .action(async ({ parsedInput, ctx }) => {
    await requirementsService.requestChanges({
      project: ctx.project,
      orgMember: ctx.orgMember,
      orgSlug: parsedInput.orgSlug,
      requirementId: parsedInput.requirementId,
      description: parsedInput.description,
      referencedThreadIds: parsedInput.referencedThreadIds,
    })
    return null
  })

export const resolveChangeRequestAction = projectScopedActionClient
  .metadata({})
  .inputSchema(resolveChangeRequestSchema)
  .action(({ parsedInput, ctx }) => {
    const { role } = ctx
    if (parsedInput.resolution === 'accepted') {
      if (!role.authorize({ requirement: ['resolve_changes'] }).success) {
        throw new Error('You do not have permission to resolve changes')
      }
    } else if (!role.authorize({ requirement: ['reject_changes'] }).success) {
      throw new Error('You do not have permission to reject changes')
    }
    return requirementsService.resolveChangeRequest({
      project: ctx.project,
      orgMember: ctx.orgMember,
      requirementId: parsedInput.requirementId,
      changeRequestId: parsedInput.changeRequestId,
      resolution: parsedInput.resolution,
    })
  })

export const addThreadReplyAction = projectScopedActionClient
  .metadata({ authorize: { thread: ['reply'] } })
  .inputSchema(addThreadReplySchema)
  .action(({ parsedInput, ctx }) =>
    requirementsService.addThreadReply({
      project: ctx.project,
      orgMember: ctx.orgMember,
      orgSlug: parsedInput.orgSlug,
      requirementId: parsedInput.requirementId,
      threadId: parsedInput.threadId,
      replyBody: parsedInput.replyBody,
    })
  )
