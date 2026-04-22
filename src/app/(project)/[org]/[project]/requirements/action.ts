'use server'

import { render } from '@react-email/components'
import { and, eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { authService } from '@/app/api/auth/service'
import { organizationsService } from '@/app/api/organizations/service'
import { projectsService } from '@/app/api/projects/service'
import { requirementsService } from '@/app/api/requirements/service'
import { teamService } from '@/app/api/teams/service'
import RequirementChangeRequestedEmail from '@/emails/templates/requirement-change-requested'
import RequirementSentForSignEmail from '@/emails/templates/requirement-sent-for-sign'
import RequirementSignedEmail from '@/emails/templates/requirement-signed'
import ThreadNewMessageEmail from '@/emails/templates/thread-new-message'
import { baseUrl } from '@/lib/metadata'
import { sendEmailsToRecipients } from '@/lib/notifications'
import { authedActionClient } from '@/lib/safe-action'
import { titleToSlug } from '@/lib/utils'
import { db } from '@/server/db'
import {
  requirementChangeRequests,
  requirementRecipients,
  requirementSignatures,
  requirements,
  threadMessages,
  threads,
} from '@/server/db/schema'
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

export const createRequirementAction = authedActionClient
  .inputSchema(createRequirementSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { orgSlug, projectId, title, body } = parsedInput
    const { orgMember, role } = ctx
    const organization = await organizationsService.getBySlug(orgSlug)
    if (!organization) {
      throw new Error('Organization not found')
    }
    const settings = await projectsService.getSettings(
      organization.id,
      projectId
    )
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
    if (!role.authorize({ requirement: ['create'] }).success) {
      throw new Error('You do not have permission to create requirements')
    }
    const { slugified, slugifiedWithSuffix } = titleToSlug(title)
    const [requirementWithSlug] = await db
      .select({ id: requirements.id })
      .from(requirements)
      .where(
        and(
          eq(requirements.projectId, projectId),
          eq(requirements.slug, slugified)
        )
      )
    const [requirement] = await db
      .insert(requirements)
      .values({
        projectId,
        authorId: orgMember.id,
        title,
        slug: requirementWithSlug ? slugifiedWithSuffix : slugified,
        body: body || '',
        status:
          settings.clientInvolvement.requirements === 'off'
            ? 'client_accepted'
            : 'draft',
      })
      .returning()

    return requirement
  })

export const updateRequirementAction = authedActionClient
  .inputSchema(updateRequirementSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { orgSlug, requirementId, title, body, projectId } = parsedInput
    const { orgMember, role } = ctx
    const organization = await organizationsService.getBySlug(orgSlug)
    if (!organization) {
      throw new Error('Organization not found')
    }
    const settings = await projectsService.getSettings(
      organization.id,
      projectId
    )
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
    if (!role.authorize({ requirement: ['update'] }).success) {
      throw new Error('You do not have permission to update requirements')
    }
    const requirement = await requirementsService.getById(
      requirementId,
      projectId,
      await headers()
    )
    if (!requirement) {
      throw new Error('Requirement not found')
    }
    if (
      requirement.status === 'client_accepted' &&
      settings.clientInvolvement.requirements === 'on'
    ) {
      throw new Error(
        'You cannot update a requirement that has been accepted by the client'
      )
    }
    const [updatedRequirement] = await db
      .update(requirements)
      .set({ title, body })
      .where(eq(requirements.id, requirementId))
      .returning()
    return updatedRequirement
  })

export const sendForSignAction = authedActionClient
  .inputSchema(sendForSignSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { orgSlug, requirementId, projectId, recipients } = parsedInput
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
    if (!role.authorize({ requirement: ['send_for_sign'] }).success) {
      throw new Error(
        'You do not have permission to send requirements for sign'
      )
    }
    const settings = await projectsService.getSettings(
      organization.id,
      projectId
    )
    if (settings.clientInvolvement.requirements === 'off') {
      throw new Error(
        'Client involvement is disabled for requirements in this project'
      )
    }
    const project = await projectsService.getById(projectId)
    if (!project) {
      throw new Error('Project not found')
    }
    const requirement = await requirementsService.getById(
      requirementId,
      projectId,
      await headers()
    )
    if (!requirement) {
      throw new Error('Requirement not found')
    }

    await db.transaction(async (tx) => {
      await tx
        .update(requirements)
        .set({
          status: 'submitted_to_client',
        })
        .where(eq(requirements.id, requirementId))
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
        await tx.insert(requirementRecipients).values({
          requirementId,
          clientMemberId: clientMember.members.id,
        })
      }

      await sendEmailsToRecipients(recipientsToSend, async (recipient) => {
        const html = await render(
          RequirementSentForSignEmail({
            recipientName: recipient.name ?? 'there',
            requirementTitle: requirement.title,
            projectName: project.name,
            senderName: orgMember.user.name ?? 'there',
            orgSlug: orgSlug ?? '',
            projectSlug: project.slug,
            requirementId: requirement.slug,
          })
        )
        return {
          to: recipient.email,
          subject: `Sign required: "${requirement.title}" — ${project.name}`,
          html,
        }
      })
      await tx.insert(requirementRecipients).values(
        recipients.map((recipient) => ({
          requirementId,
          clientMemberId: recipient,
        }))
      )
    })

    return requirement
  })

export const signRequirementAction = authedActionClient
  .inputSchema(signRequirementSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { orgSlug, requirementId, projectId, mediaId } = parsedInput
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
    if (settings.clientInvolvement.requirements === 'off') {
      throw new Error(
        'Client involvement is disabled for requirements in this project'
      )
    }
    const project = await projectsService.getById(projectId)
    if (!project) {
      throw new Error('Project not found')
    }
    const requirement = await requirementsService.getById(
      requirementId,
      projectId,
      await headers()
    )
    if (!requirement) {
      throw new Error('Requirement not found')
    }
    if (requirement.status !== 'submitted_to_client') {
      throw new Error('Requirement is not pending signature')
    }
    const recipients = await requirementsService.getRecipients(requirementId)
    const isRecipient = recipients.some(
      (r) => r.clientMemberId === orgMember.id
    )
    if (!isRecipient) {
      throw new Error('You are not a recipient of this requirement')
    }
    const existingSignatures =
      await requirementsService.getSignatures(requirementId)
    if (existingSignatures.some((s) => s.clientMemberId === orgMember.id)) {
      throw new Error('You have already signed this requirement')
    }

    await db.transaction(async (tx) => {
      await tx.insert(requirementSignatures).values({
        requirementId,
        clientMemberId: orgMember.id,
        mediaId,
      })

      const totalRecipients = recipients.length
      const totalSigned = existingSignatures.length + 1
      if (totalSigned >= totalRecipients) {
        await tx
          .update(requirements)
          .set({ status: 'client_accepted' })
          .where(eq(requirements.id, requirementId))
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
          RequirementSignedEmail({
            recipientName: recipient.name ?? 'there',
            requirementTitle: requirement.title,
            projectName: project.name,
            signerName: orgMember.user.name ?? 'A stakeholder',
            signedAt: new Date().toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            }),
            orgSlug,
            projectSlug: project.slug,
            requirementId: requirement.slug,
          })
        )
        return {
          to: recipient.email,
          subject: `Requirement signed: "${requirement.title}" — ${project.name}`,
          html,
        }
      })
    })

    return { success: true }
  })

export const createThreadAction = authedActionClient
  .inputSchema(createThreadSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { orgSlug, requirementId, projectId, selectedText, threadBody } =
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
    const requirement = await requirementsService.getById(
      requirementId,
      projectId,
      await headers()
    )
    if (!requirement) {
      throw new Error('Requirement not found')
    }
    const thread = await db.transaction(async (tx) => {
      const [thread] = await tx
        .insert(threads)
        .values({
          projectId,
          entityId: requirementId,
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
            contextName: requirement.title,
            contextType: 'requirement',
            projectName: project.name,
            orgSlug,
            projectSlug: project.slug,
            threadLink: `${baseUrl}/${orgSlug}/${project.slug}/requirements/${requirement.slug}#thread_${thread!.id}`,
            messagePreview: threadBody,
            senderName: orgMember.user.name ?? 'there',
            threadTitle: selectedText,
            recipientName: recipient.name ?? 'there',
          })
        )
        return {
          to: recipient.email,
          subject: `New thread in "${requirement.title}" — ${project.name}`,
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

export const requestChangesAction = authedActionClient
  .inputSchema(requestChangesSchema)
  .action(async ({ parsedInput, ctx }) => {
    const {
      orgSlug,
      requirementId,
      projectId,
      description,
      referencedThreadIds,
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
    if (!role.authorize({ requirement: ['request_changes'] }).success) {
      throw new Error('You do not have permission to request changes')
    }
    const settings = await projectsService.getSettings(
      organization.id,
      projectId
    )
    if (settings.clientInvolvement.requirements === 'off') {
      throw new Error(
        'Client involvement is disabled for requirements in this project'
      )
    }
    const project = await projectsService.getById(projectId)
    if (!project) {
      throw new Error('Project not found')
    }
    const requirement = await requirementsService.getById(
      requirementId,
      projectId,
      await headers()
    )
    if (!requirement) {
      throw new Error('Requirement not found')
    }
    await db.transaction(async (tx) => {
      await tx.insert(requirementChangeRequests).values({
        requirementId,
        description: description ?? '',
        referencedThreadIds,
        requestedByMemberId: orgMember.id,
      })
      await tx
        .update(requirements)
        .set({
          status: 'changes_requested',
        })
        .where(eq(requirements.id, requirementId))
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
          RequirementChangeRequestedEmail({
            recipientName: recipient.name ?? 'there',
            requirementTitle: requirement.title,
            projectName: project.name,
            requesterName: orgMember.user.name ?? 'there',
            description: description ?? '',
            orgSlug,
            projectSlug: project.slug,
            requirementId: requirement.slug,
          })
        )
        return {
          to: recipient.email,
          subject: `Changes requested on "${requirement.title}" — ${project.name}`,
          html,
        }
      })
    })
    return null
  })

export const resolveChangeRequestAction = authedActionClient
  .inputSchema(resolveChangeRequestSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { orgSlug, changeRequestId, projectId, requirementId, resolution } =
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
    const project = await projectsService.getById(projectId)
    if (!project) {
      throw new Error('Project not found')
    }
    const requirement = await requirementsService.getById(
      requirementId,
      projectId,
      await headers()
    )
    if (!requirement) {
      throw new Error('Requirement not found')
    }
    const changeRequest = await requirementsService.getChangeRequestById(
      changeRequestId,
      requirementId
    )
    if (!changeRequest) {
      throw new Error('Change request not found')
    }
    const settings = await projectsService.getSettings(
      organization.id,
      projectId
    )
    if (settings.clientInvolvement.requirements === 'off') {
      throw new Error(
        'Client involvement is disabled for requirements in this project'
      )
    }
    if (resolution === 'accepted') {
      if (!role.authorize({ requirement: ['resolve_changes'] }).success) {
        throw new Error('You do not have permission to resolve changes')
      }
    } else if (!role.authorize({ requirement: ['reject_changes'] }).success) {
      throw new Error('You do not have permission to reject changes')
    }
    const updatedChangeRequest = await db.transaction(async (tx) => {
      const [updatedChangeRequest] = await tx
        .update(requirementChangeRequests)
        .set({ status: resolution, resolvedAt: new Date() })
        .returning()
        .where(eq(requirementChangeRequests.id, changeRequestId))
      return updatedChangeRequest
    })
    return updatedChangeRequest
  })

export const addThreadReplyAction = authedActionClient
  .inputSchema(addThreadReplySchema)
  .action(async ({ parsedInput, ctx }) => {
    const { orgSlug, requirementId, projectId, threadId, replyBody } =
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
    if (!role.authorize({ thread: ['reply'] }).success) {
      throw new Error('You do not have permission to reply to threads')
    }
    const project = await projectsService.getById(projectId)
    if (!project) {
      throw new Error('Project not found')
    }
    const requirement = await requirementsService.getById(
      requirementId,
      projectId,
      await headers()
    )
    if (!requirement) {
      throw new Error('Requirement not found')
    }
    const thread = await requirementsService.getThreadById(threadId, projectId)
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
            contextType: 'requirement',
            contextName: requirement.title,
            projectName: project.name,
            orgSlug,
            projectSlug: project.slug,
            threadLink: `${baseUrl}/${orgSlug}/${project.slug}/requirements/${requirement.slug}#thread_${thread.id}`,
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
