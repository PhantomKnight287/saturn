'use server'

import { proposalsService } from '@/app/api/proposals/service'
import { projectScopedActionClient } from '@/lib/safe-action'
import {
  addReplySchema,
  addThreadSchema,
  createProposalSchema,
  declineProposalSchema,
  deleteProposalSchema,
  sendProposalSchema,
  signProposalSchema,
  updateProposalSchema,
} from './common'

export const createProposalAction = projectScopedActionClient
  .metadata({ authorize: { proposal: ['create'] } })
  .inputSchema(createProposalSchema)
  .action(({ parsedInput, ctx }) =>
    proposalsService.create({
      project: ctx.project,
      authorId: ctx.orgMember.id,
      title: parsedInput.title,
      body: parsedInput.body,
      terms: parsedInput.terms,
      validUntil: parsedInput.validUntil,
      currency: parsedInput.currency,
      deliverables: parsedInput.deliverables,
    })
  )

export const updateProposalAction = projectScopedActionClient
  .metadata({ authorize: { proposal: ['update'] } })
  .inputSchema(updateProposalSchema)
  .action(({ parsedInput, ctx }) =>
    proposalsService.update({
      project: ctx.project,
      proposalId: parsedInput.proposalId,
      title: parsedInput.title,
      body: parsedInput.body,
      terms: parsedInput.terms,
      validUntil: parsedInput.validUntil,
      currency: parsedInput.currency,
      deliverables: parsedInput.deliverables,
    })
  )

export const sendProposalAction = projectScopedActionClient
  .metadata({ authorize: { proposal: ['send'] } })
  .inputSchema(sendProposalSchema)
  .action(({ parsedInput, ctx }) =>
    proposalsService.send({
      project: ctx.project,
      orgMember: ctx.orgMember,
      orgSlug: parsedInput.orgSlug,
      proposalId: parsedInput.proposalId,
      recipients: parsedInput.recipients,
    })
  )

export const signProposalAction = projectScopedActionClient
  .metadata({})
  .inputSchema(signProposalSchema)
  .action(({ parsedInput, ctx }) =>
    proposalsService.sign({
      project: ctx.project,
      orgMember: ctx.orgMember,
      orgSlug: parsedInput.orgSlug,
      proposalId: parsedInput.proposalId,
      mediaId: parsedInput.mediaId,
    })
  )

export const createThreadAction = projectScopedActionClient
  .metadata({ authorize: { thread: ['create'] } })
  .inputSchema(addThreadSchema)
  .action(({ parsedInput, ctx }) =>
    proposalsService.createThread({
      project: ctx.project,
      orgMember: ctx.orgMember,
      orgSlug: parsedInput.orgSlug,
      proposalId: parsedInput.proposalId,
      selectedText: parsedInput.selectedText,
      threadBody: parsedInput.threadBody,
    })
  )

export const addThreadReplyAction = projectScopedActionClient
  .metadata({ authorize: { thread: ['reply'] } })
  .inputSchema(addReplySchema)
  .action(({ parsedInput, ctx }) =>
    proposalsService.addThreadReply({
      project: ctx.project,
      orgMember: ctx.orgMember,
      orgSlug: parsedInput.orgSlug,
      proposalId: parsedInput.proposalId,
      threadId: parsedInput.threadId,
      replyBody: parsedInput.replyBody,
    })
  )

export const declineProposalAction = projectScopedActionClient
  .metadata({})
  .inputSchema(declineProposalSchema)
  .action(({ parsedInput, ctx }) =>
    proposalsService.decline({
      project: ctx.project,
      orgMember: ctx.orgMember,
      proposalId: parsedInput.proposalId,
    })
  )

export const deleteProposalAction = projectScopedActionClient
  .metadata({ authorize: { proposal: ['delete'] } })
  .inputSchema(deleteProposalSchema)
  .action(({ parsedInput }) =>
    proposalsService.remove(parsedInput.proposalId, parsedInput.projectId)
  )
