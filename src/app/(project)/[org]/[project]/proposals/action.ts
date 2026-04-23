'use server'

import { render } from '@react-email/components'
import { and, eq } from 'drizzle-orm'
import { authService } from '@/app/api/auth/service'
import { organizationsService } from '@/app/api/organizations/service'
import { projectsService } from '@/app/api/projects/service'
import { proposalsService } from '@/app/api/proposals/service'
import { teamService } from '@/app/api/teams/service'
import ProposalApprovedEmail from '@/emails/templates/proposal-approved'
import ProposalSentEmail from '@/emails/templates/proposal-sent'
import ThreadNewMessageEmail from '@/emails/templates/thread-new-message'
import { baseUrl } from '@/lib/metadata'
import { sendEmailsToRecipients } from '@/lib/notifications'
import { authedActionClient } from '@/lib/safe-action'
import { titleToSlug } from '@/lib/utils'
import { db } from '@/server/db'
import {
  proposalDeliverables,
  proposalRecipients,
  proposalSignatures,
  proposals,
  threadMessages,
  threads,
} from '@/server/db/schema'
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

export const createProposalAction = authedActionClient
  .inputSchema(createProposalSchema)
  .action(async ({ parsedInput, ctx }) => {
    const {
      orgSlug,
      projectId,
      title,
      body,
      terms,
      validUntil,
      currency,
      deliverables,
    } = parsedInput
    const { orgMember, role } = ctx
    const organization = await organizationsService.getBySlug(orgSlug)
    if (!organization) {
      throw new Error('Organization not found')
    }
    const hasProjectAccess = await authService.checkProjectAccess(
      organization.id,
      projectId,
      orgMember.userId
    )
    if (hasProjectAccess.success === false) {
      throw new Error(
        hasProjectAccess.error ?? 'You do not have access to this project'
      )
    }
    if (!role.authorize({ proposal: ['create'] }).success) {
      throw new Error('You do not have permission to create proposals')
    }
    const settings = await projectsService.getSettings(
      organization.id,
      projectId
    )
    const { slugified, slugifiedWithSuffix } = titleToSlug(title)
    const [proposalWithSlug] = await db
      .select({ id: proposals.id })
      .from(proposals)
      .where(
        and(eq(proposals.projectId, projectId), eq(proposals.slug, slugified))
      )

    const proposal = await db.transaction(async (tx) => {
      const [proposal] = await tx
        .insert(proposals)
        .values({
          projectId,
          authorId: orgMember.id,
          title,
          slug: proposalWithSlug ? slugifiedWithSuffix : slugified,
          body: body || '',
          terms: terms || null,
          validUntil: validUntil ? new Date(validUntil) : null,
          currency: currency || 'USD',
          totalAmount: calculateTotal(deliverables),
          status:
            settings.clientInvolvement.proposals === 'off'
              ? 'client_accepted'
              : 'draft',
        })
        .returning()

      if (deliverables && deliverables.length > 0) {
        await tx.insert(proposalDeliverables).values(
          deliverables.map((d, i) => ({
            proposalId: proposal!.id,
            title: d.description,
            quantity: d.quantity,
            unitPrice: d.unitPrice,
            amount: d.amount,
            sortOrder: i,
          }))
        )
      }

      return proposal
    })

    return proposal
  })

export const updateProposalAction = authedActionClient
  .inputSchema(updateProposalSchema)
  .action(async ({ parsedInput, ctx }) => {
    const {
      orgSlug,
      proposalId,
      projectId,
      title,
      body,
      terms,
      validUntil,
      currency,
      deliverables,
    } = parsedInput
    const { orgMember, role } = ctx
    const organization = await organizationsService.getBySlug(orgSlug)
    if (!organization) {
      throw new Error('Organization not found')
    }
    const hasProjectAccess = await authService.checkProjectAccess(
      organization.id,
      projectId,
      orgMember.userId
    )
    if (hasProjectAccess.success === false) {
      throw new Error(
        hasProjectAccess.error ?? 'You do not have access to this project'
      )
    }
    if (!role.authorize({ proposal: ['update'] }).success) {
      throw new Error('You do not have permission to update proposals')
    }
    const settings = await projectsService.getSettings(
      organization.id,
      projectId
    )
    const proposal = await getProposalById(proposalId, projectId)
    if (!proposal) {
      throw new Error('Proposal not found')
    }
    if (
      proposal.status === 'client_accepted' &&
      settings.clientInvolvement.proposals === 'on'
    ) {
      throw new Error(
        'You cannot update a proposal that has been accepted by the client'
      )
    }

    const updatedProposal = await db.transaction(async (tx) => {
      const [updatedProposal] = await tx
        .update(proposals)
        .set({
          title,
          body,
          terms: terms || null,
          validUntil: validUntil ? new Date(validUntil) : null,
          currency,
          totalAmount: calculateTotal(deliverables),
        })
        .where(eq(proposals.id, proposalId))
        .returning()

      if (deliverables) {
        await tx
          .delete(proposalDeliverables)
          .where(eq(proposalDeliverables.proposalId, proposalId))
        if (deliverables.length > 0) {
          await tx.insert(proposalDeliverables).values(
            deliverables.map((d, i) => ({
              proposalId,
              title: d.description,
              quantity: d.quantity,
              unitPrice: d.unitPrice,
              amount: d.amount,
              sortOrder: i,
            }))
          )
        }
      }

      return updatedProposal
    })

    return updatedProposal
  })

export const sendProposalAction = authedActionClient
  .inputSchema(sendProposalSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { orgSlug, proposalId, projectId, recipients } = parsedInput
    const { orgMember, role } = ctx
    const organization = await organizationsService.getBySlug(orgSlug)
    if (!organization) {
      throw new Error('Organization not found')
    }
    const hasProjectAccess = await authService.checkProjectAccess(
      organization.id,
      projectId,
      orgMember.userId
    )
    if (hasProjectAccess.success === false) {
      throw new Error(
        hasProjectAccess.error ?? 'You do not have access to this project'
      )
    }
    if (!role.authorize({ proposal: ['send'] }).success) {
      throw new Error('You do not have permission to send proposals')
    }
    const settings = await projectsService.getSettings(
      organization.id,
      projectId
    )
    if (settings.clientInvolvement.proposals === 'off') {
      throw new Error(
        'Client involvement is disabled for proposals in this project'
      )
    }
    const project = await projectsService.getById(projectId)
    if (!project) {
      throw new Error('Project not found')
    }
    const proposal = await getProposalById(proposalId, projectId)
    if (!proposal) {
      throw new Error('Proposal not found')
    }

    await db.transaction(async (tx) => {
      await tx
        .update(proposals)
        .set({ status: 'submitted_to_client' })
        .where(eq(proposals.id, proposalId))

      const recipientsToSend: { email: string; name: string }[] = []
      for (const recipient of recipients) {
        const clientMember = await teamService.getClientMemberById(recipient)
        if (!clientMember) {
          continue
        }
        recipientsToSend.push({
          email: clientMember.users.email,
          name: clientMember.users.name,
        })
      }

      await sendEmailsToRecipients(recipientsToSend, async (recipient) => {
        const html = await render(
          ProposalSentEmail({
            recipientName: recipient.name ?? 'there',
            proposalTitle: proposal.title,
            organizationName: organization.name,
            senderName: orgMember.user.name ?? 'there',
            totalAmount: proposal.totalAmount,
            currency: proposal.currency,
            pricingType: 'fixed',
            validUntil: proposal.validUntil
              ? proposal.validUntil.toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })
              : null,
            orgSlug,
            proposalSlug: proposal.slug,
          })
        )
        return {
          to: recipient.email,
          subject: `New proposal: "${proposal.title}" — ${project.name}`,
          html,
        }
      })

      await tx
        .insert(proposalRecipients)
        .values(
          recipients.map((recipient) => ({
            proposalId,
            clientMemberId: recipient,
          }))
        )
        .onConflictDoNothing()
    })

    return proposal
  })

export const signProposalAction = authedActionClient
  .inputSchema(signProposalSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { orgSlug, proposalId, projectId, mediaId } = parsedInput
    const { orgMember } = ctx
    const organization = await organizationsService.getBySlug(orgSlug)
    if (!organization) {
      throw new Error('Organization not found')
    }
    const hasProjectAccess = await authService.checkProjectAccess(
      organization.id,
      projectId,
      orgMember.userId
    )
    if (hasProjectAccess.success === false) {
      throw new Error(
        hasProjectAccess.error ?? 'You do not have access to this project'
      )
    }
    const settings = await projectsService.getSettings(
      organization.id,
      projectId
    )
    if (settings.clientInvolvement.proposals === 'off') {
      throw new Error(
        'Client involvement is disabled for proposals in this project'
      )
    }
    const project = await projectsService.getById(projectId)
    if (!project) {
      throw new Error('Project not found')
    }
    const proposal = await getProposalById(proposalId, projectId)
    if (!proposal) {
      throw new Error('Proposal not found')
    }
    if (proposal.status !== 'submitted_to_client') {
      throw new Error('Proposal is not pending signature')
    }
    const recipients = await proposalsService.getRecipients(proposalId)
    const isRecipient = recipients.some(
      (r) => r.clientMemberId === orgMember.id
    )
    if (!isRecipient) {
      throw new Error('You are not a recipient of this proposal')
    }
    const existingSignatures = await proposalsService.getSignatures(proposalId)
    if (existingSignatures.some((s) => s.clientMemberId === orgMember.id)) {
      throw new Error('You have already signed this proposal')
    }

    await db.transaction(async (tx) => {
      await tx.insert(proposalSignatures).values({
        proposalId,
        clientMemberId: orgMember.id,
        mediaId,
      })

      const totalRecipients = recipients.length
      const totalSigned = existingSignatures.length + 1
      if (totalSigned >= totalRecipients) {
        await tx
          .update(proposals)
          .set({ status: 'client_accepted' })
          .where(eq(proposals.id, proposalId))
      }

      const admins = await teamService.getAdminAndOwners(organization.id)
      const emailsToSend: { email: string; name: string }[] = []
      for (const admin of admins) {
        emailsToSend.push({
          email: admin.users.email,
          name: admin.users.name,
        })
      }
      await sendEmailsToRecipients(emailsToSend, async (recipient) => {
        const html = await render(
          ProposalApprovedEmail({
            recipientName: recipient.name ?? 'there',
            proposalTitle: proposal.title,
            clientName: orgMember.user.name ?? 'A stakeholder',
            totalAmount: proposal.totalAmount,
            currency: proposal.currency,
            orgSlug,
            proposalSlug: proposal.slug,
          })
        )
        return {
          to: recipient.email,
          subject: `Proposal signed: "${proposal.title}" — ${project.name}`,
          html,
        }
      })
    })

    return { success: true }
  })

export const createThreadAction = authedActionClient
  .inputSchema(addThreadSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { orgSlug, proposalId, projectId, selectedText, threadBody } =
      parsedInput
    const { orgMember, role } = ctx
    const organization = await organizationsService.getBySlug(orgSlug)
    if (!organization) {
      throw new Error('Organization not found')
    }
    const hasProjectAccess = await authService.checkProjectAccess(
      organization.id,
      projectId,
      orgMember.userId
    )
    if (hasProjectAccess.success === false) {
      throw new Error(
        hasProjectAccess.error ?? 'You do not have access to this project'
      )
    }
    if (!role.authorize({ thread: ['create'] }).success) {
      throw new Error('You do not have permission to create threads')
    }
    const project = await projectsService.getById(projectId)
    if (!project) {
      throw new Error('Project not found')
    }
    const proposal = await getProposalById(proposalId, projectId)
    if (!proposal) {
      throw new Error('Proposal not found')
    }
    const thread = await db.transaction(async (tx) => {
      const [thread] = await tx
        .insert(threads)
        .values({
          projectId,
          entityId: proposalId,
          selectedText,
          createdByMemberId: orgMember.id,
        })
        .returning()
      const receipients = await teamService.getAdminAndOwners(organization.id)
      const emailsToSend: { email: string; name: string }[] = []
      for (const recipient of receipients) {
        emailsToSend.push({
          email: recipient.users.email,
          name: recipient.users.name,
        })
      }
      await sendEmailsToRecipients(emailsToSend, async (recipient) => {
        const html = await render(
          ThreadNewMessageEmail({
            contextName: proposal.title,
            contextType: 'proposal',
            projectName: project.name,
            orgSlug,
            projectSlug: project.slug,
            threadLink: `${baseUrl}/${orgSlug}/${project.slug}/proposals/${proposal.slug}#thread_${thread!.id}`,
            messagePreview: threadBody,
            senderName: orgMember.user.name ?? 'there',
            threadTitle: selectedText,
            recipientName: recipient.name ?? 'there',
          })
        )
        return {
          to: recipient.email,
          subject: `New thread in "${proposal.title}" — ${project.name}`,
          html,
        }
      })
      await tx.insert(threadMessages).values({
        threadId: thread!.id,
        body: threadBody,
        authorMemberId: orgMember.id,
      })
      return thread
    })
    return thread ?? null
  })

export const addThreadReplyAction = authedActionClient
  .inputSchema(addReplySchema)
  .action(async ({ parsedInput, ctx }) => {
    const { orgSlug, proposalId, projectId, threadId, replyBody } = parsedInput
    const { orgMember, role } = ctx
    const organization = await organizationsService.getBySlug(orgSlug)
    if (!organization) {
      throw new Error('Organization not found')
    }
    const hasProjectAccess = await authService.checkProjectAccess(
      organization.id,
      projectId,
      orgMember.userId
    )
    if (hasProjectAccess.success === false) {
      throw new Error(
        hasProjectAccess.error ?? 'You do not have access to this project'
      )
    }
    if (!role.authorize({ thread: ['reply'] }).success) {
      throw new Error('You do not have permission to reply to threads')
    }
    const project = await projectsService.getById(projectId)
    if (!project) {
      throw new Error('Project not found')
    }
    const proposal = await getProposalById(proposalId, projectId)
    if (!proposal) {
      throw new Error('Proposal not found')
    }
    const [thread] = await db
      .select()
      .from(threads)
      .where(and(eq(threads.id, threadId), eq(threads.projectId, projectId)))
    if (!thread) {
      throw new Error('Thread not found')
    }
    const threadMessage = await db.transaction(async (tx) => {
      const [threadMessage] = await tx
        .insert(threadMessages)
        .values({
          threadId,
          body: replyBody,
          authorMemberId: orgMember.id,
        })
        .returning()
      const receipients = await teamService.getAdminAndOwners(organization.id)
      const emailsToSend: { email: string; name: string }[] = []
      for (const recipient of receipients) {
        emailsToSend.push({
          email: recipient.users.email,
          name: recipient.users.name,
        })
      }
      await sendEmailsToRecipients(emailsToSend, async (recipient) => {
        const html = await render(
          ThreadNewMessageEmail({
            recipientName: recipient.name ?? 'there',
            senderName: orgMember.user.name ?? 'there',
            threadTitle: thread.selectedText,
            messagePreview: replyBody,
            contextType: 'proposal',
            contextName: proposal.title,
            projectName: project.name,
            orgSlug,
            projectSlug: project.slug,
            threadLink: `${baseUrl}/${orgSlug}/${project.slug}/proposals/${proposal.slug}#thread_${thread.id}`,
          })
        )
        return {
          to: recipient.email,
          subject: `New reply in thread "${thread.selectedText}" — ${project.name}`,
          html,
        }
      })
      return threadMessage
    })
    return threadMessage
  })

export const declineProposalAction = authedActionClient
  .inputSchema(declineProposalSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { orgSlug, proposalId, projectId } = parsedInput
    const { orgMember } = ctx
    const organization = await organizationsService.getBySlug(orgSlug)
    if (!organization) {
      throw new Error('Organization not found')
    }
    const hasProjectAccess = await authService.checkProjectAccess(
      organization.id,
      projectId,
      orgMember.userId
    )
    if (hasProjectAccess.success === false) {
      throw new Error(
        hasProjectAccess.error ?? 'You do not have access to this project'
      )
    }
    const settings = await projectsService.getSettings(
      organization.id,
      projectId
    )
    if (settings.clientInvolvement.proposals === 'off') {
      throw new Error(
        'Client involvement is disabled for proposals in this project'
      )
    }
    const proposal = await getProposalById(proposalId, projectId)
    if (!proposal) {
      throw new Error('Proposal not found')
    }
    if (proposal.status !== 'submitted_to_client') {
      throw new Error('Proposal is not pending client review')
    }
    const recipients = await proposalsService.getRecipients(proposalId)
    const isRecipient = recipients.some(
      (r) => r.clientMemberId === orgMember.id
    )
    if (!isRecipient) {
      throw new Error('You are not a recipient of this proposal')
    }

    await db
      .update(proposals)
      .set({ status: 'client_rejected' })
      .where(eq(proposals.id, proposalId))

    return { success: true }
  })

export const deleteProposalAction = authedActionClient
  .inputSchema(deleteProposalSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { orgSlug, proposalId, projectId } = parsedInput
    const { orgMember, role } = ctx
    const organization = await organizationsService.getBySlug(orgSlug)
    if (!organization) {
      throw new Error('Organization not found')
    }
    const hasProjectAccess = await authService.checkProjectAccess(
      organization.id,
      projectId,
      orgMember.userId
    )
    if (hasProjectAccess.success === false) {
      throw new Error(
        hasProjectAccess.error ?? 'You do not have access to this project'
      )
    }
    if (!role.authorize({ proposal: ['delete'] }).success) {
      throw new Error('You do not have permission to delete proposals')
    }
    const proposal = await getProposalById(proposalId, projectId)
    if (!proposal) {
      throw new Error('Proposal not found')
    }
    await db.delete(proposals).where(eq(proposals.id, proposalId))
    return { success: true }
  })

async function getProposalById(proposalId: string, projectId: string) {
  const [proposal] = await db
    .select()
    .from(proposals)
    .where(
      and(eq(proposals.id, proposalId), eq(proposals.projectId, projectId))
    )
  return proposal ?? null
}

function calculateTotal(deliverables?: { amount: string }[]): string {
  if (!deliverables || deliverables.length === 0) {
    return '0'
  }
  return deliverables
    .reduce((sum, d) => sum + Number.parseFloat(d.amount || '0'), 0)
    .toFixed(4)
}
