import { render } from '@react-email/components'
import { and, asc, desc, eq, getTableColumns, inArray, not } from 'drizzle-orm'
import { projectsService } from '@/app/api/projects/service'
import { teamService } from '@/app/api/teams/service'
import RequirementChangeRequestedEmail from '@/emails/templates/requirement-change-requested'
import RequirementSentForSignEmail from '@/emails/templates/requirement-sent-for-sign'
import RequirementSignedEmail from '@/emails/templates/requirement-signed'
import ThreadNewMessageEmail from '@/emails/templates/thread-new-message'
import { baseUrl } from '@/lib/metadata'
import { sendEmailsToRecipients } from '@/lib/notifications'
import { titleToSlug } from '@/lib/utils'
import type { ActiveMember, Project } from '@/server/access/project-access'
import { db } from '@/server/db'
import {
  media as mediaTable,
  members as membersTable,
  requirementChangeRequests as requirementChangeRequestsTable,
  requirementRecipients,
  requirementRecipients as requirementRecipientsTable,
  requirementSignatures as requirementSignaturesTable,
  requirements,
  threadMessages as threadMessagesTable,
  threads as threadsTable,
  users,
} from '@/server/db/schema'
import type { Role } from '@/types'

const listByProject = async ({
  memberId,
  projectId,
  role,
}: {
  projectId: string
  role: Role
  memberId: string
}) => {
  if (role === 'client') {
    return await db
      .select(getTableColumns(requirements))
      .from(requirements)
      .where(
        and(
          eq(requirements.projectId, projectId),
          not(eq(requirements.status, 'draft'))
        )
      )
      .innerJoin(
        requirementRecipients,
        and(
          eq(requirementRecipients.requirementId, requirements.id),
          eq(requirementRecipients.clientMemberId, memberId)
        )
      )
      .orderBy(desc(requirements.updatedAt))
  }
  return await db
    .select()
    .from(requirements)
    .where(eq(requirements.projectId, projectId))
    .orderBy(desc(requirements.updatedAt))
}

const getById = async ({
  projectId,
  requirementId,
  role,
}: {
  requirementId: string
  projectId: string
  role: Role
}) => {
  const [requirement] = await db
    .select()
    .from(requirements)
    .where(
      and(
        eq(requirements.id, requirementId),
        eq(requirements.projectId, projectId)
      )
    )

  if (!requirement) {
    return null
  }

  if (role === 'client' && requirement.status === 'draft') {
    return null
  }

  return requirement
}

const getBySlug = async ({
  projectId,
  role,
  slug,
  memberId,
}: {
  projectId: string
  slug: string
  role: Role
  memberId: string
}) => {
  let requirement: typeof requirements.$inferSelect | undefined
  if (role === 'client') {
    const requiredRequirements = await db
      .select(getTableColumns(requirements))
      .from(requirements)
      .where(
        and(eq(requirements.projectId, projectId), eq(requirements.slug, slug))
      )
      .innerJoin(
        requirementRecipients,
        and(
          eq(requirementRecipients.requirementId, requirements.id),
          eq(requirementRecipients.clientMemberId, memberId)
        )
      )
    requirement = requiredRequirements[0]
  } else {
    const requiredRequirements = await db
      .select()
      .from(requirements)
      .where(
        and(eq(requirements.projectId, projectId), eq(requirements.slug, slug))
      )
    requirement = requiredRequirements[0]
  }

  return requirement ?? null
}

const getThreads = async ({
  entityId,
  projectId,
}: {
  projectId: string
  entityId: string
}) => {
  const rows = await db
    .select()
    .from(threadsTable)
    .where(
      and(
        eq(threadsTable.projectId, projectId),
        eq(threadsTable.entityId, entityId)
      )
    )
    .orderBy(asc(threadsTable.createdAt))

  const threadIds = rows.map((t) => t.id)
  if (threadIds.length === 0) {
    return []
  }

  const messages = await db
    .select({
      id: threadMessagesTable.id,
      threadId: threadMessagesTable.threadId,
      authorMemberId: threadMessagesTable.authorMemberId,
      authorName: users.name,
      authorImage: users.image,
      body: threadMessagesTable.body,
      createdAt: threadMessagesTable.createdAt,
    })
    .from(threadMessagesTable)
    .leftJoin(
      membersTable,
      eq(threadMessagesTable.authorMemberId, membersTable.id)
    )
    .leftJoin(users, eq(membersTable.userId, users.id))
    .where(inArray(threadMessagesTable.threadId, threadIds))
    .orderBy(asc(threadMessagesTable.createdAt))

  const messagesByThread = new Map<string, typeof messages>()
  for (const msg of messages) {
    const list = messagesByThread.get(msg.threadId) ?? []
    list.push(msg)
    messagesByThread.set(msg.threadId, list)
  }

  const creatorIds = rows
    .map((t) => t.createdByMemberId)
    .filter((id): id is string => id != null)
  const creators =
    creatorIds.length > 0
      ? await db
          .select({
            memberId: membersTable.id,
            name: users.name,
            image: users.image,
          })
          .from(membersTable)
          .leftJoin(users, eq(membersTable.userId, users.id))
          .where(inArray(membersTable.id, creatorIds))
      : []

  const creatorMap = new Map(creators.map((c) => [c.memberId, c]))

  return rows.map((t) => {
    const creator = t.createdByMemberId
      ? creatorMap.get(t.createdByMemberId)
      : null
    return {
      id: t.id,
      selectedText: t.selectedText,
      status: t.status,
      createdByMemberId: t.createdByMemberId,
      createdByName: creator?.name ?? null,
      createdByImage: creator?.image ?? null,
      messages: messagesByThread.get(t.id) ?? [],
      createdAt: t.createdAt,
    }
  })
}

const getRecipients = async (requirementId: string) =>
  await db
    .select()
    .from(requirementRecipientsTable)
    .where(eq(requirementRecipientsTable.requirementId, requirementId))

const getSignatures = async (requirementId: string) =>
  await db
    .select({
      id: requirementSignaturesTable.id,
      requirementId: requirementSignaturesTable.requirementId,
      clientMemberId: requirementSignaturesTable.clientMemberId,
      signedAt: requirementSignaturesTable.signedAt,
      mediaId: requirementSignaturesTable.mediaId,
      mediaFileName: mediaTable.name,
      signerName: users.name,
      signerImage: users.image,
    })
    .from(requirementSignaturesTable)
    .leftJoin(mediaTable, eq(requirementSignaturesTable.mediaId, mediaTable.id))
    .leftJoin(
      membersTable,
      eq(requirementSignaturesTable.clientMemberId, membersTable.id)
    )
    .leftJoin(users, eq(membersTable.userId, users.id))
    .where(eq(requirementSignaturesTable.requirementId, requirementId))

const getChangeRequests = async (requirementId: string) => {
  const rows = await db
    .select({
      id: requirementChangeRequestsTable.id,
      description: requirementChangeRequestsTable.description,
      referencedThreadIds: requirementChangeRequestsTable.referencedThreadIds,
      status: requirementChangeRequestsTable.status,
      createdAt: requirementChangeRequestsTable.createdAt,
      resolvedAt: requirementChangeRequestsTable.resolvedAt,
      requestedByMemberId: requirementChangeRequestsTable.requestedByMemberId,
      requestedByName: users.name,
      requestedByImage: users.image,
    })
    .from(requirementChangeRequestsTable)
    .leftJoin(
      membersTable,
      eq(requirementChangeRequestsTable.requestedByMemberId, membersTable.id)
    )
    .leftJoin(users, eq(membersTable.userId, users.id))
    .where(eq(requirementChangeRequestsTable.requirementId, requirementId))
    .orderBy(desc(requirementChangeRequestsTable.createdAt))

  return rows
}

export const getChangeRequestById = async (
  changeRequestId: string,
  requirementId: string
) => {
  const [changeRequest] = await db
    .select()
    .from(requirementChangeRequestsTable)
    .where(
      and(
        eq(requirementChangeRequestsTable.id, changeRequestId),
        eq(requirementChangeRequestsTable.requirementId, requirementId)
      )
    )

  return changeRequest ?? null
}

export const getThreadById = async (threadId: string, projectId: string) => {
  const [thread] = await db
    .select()
    .from(threadsTable)
    .where(
      and(eq(threadsTable.id, threadId), eq(threadsTable.projectId, projectId))
    )
  return thread ?? null
}

const getSignatureMediaForMember = async (memberId: string) =>
  await db
    .select({
      id: mediaTable.id,
      name: mediaTable.name,
      contentType: mediaTable.contentType,
      createdAt: mediaTable.createdAt,
    })
    .from(requirementSignaturesTable)
    .innerJoin(
      mediaTable,
      eq(requirementSignaturesTable.mediaId, mediaTable.id)
    )
    .where(eq(requirementSignaturesTable.clientMemberId, memberId))
    .groupBy(mediaTable.id)
    .orderBy(desc(mediaTable.createdAt))

const create = async ({
  project,
  authorId,
  title,
  body,
}: {
  project: Project
  authorId: string
  title: string
  body?: string | null
}) => {
  const settings = await projectsService.getSettings(
    project.organizationId,
    project.id
  )
  const { slugified, slugifiedWithSuffix } = titleToSlug(title)
  const [requirementWithSlug] = await db
    .select({ id: requirements.id })
    .from(requirements)
    .where(
      and(
        eq(requirements.projectId, project.id),
        eq(requirements.slug, slugified)
      )
    )
  const [requirement] = await db
    .insert(requirements)
    .values({
      projectId: project.id,
      authorId,
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
}

const update = async ({
  project,
  orgMember,
  requirementId,
  title,
  body,
}: {
  project: Project
  orgMember: ActiveMember
  requirementId: string
  title: string
  body?: string
}) => {
  const settings = await projectsService.getSettings(
    project.organizationId,
    project.id
  )
  const requirement = await getById({
    role: orgMember.role as Role,
    projectId: project.id,
    requirementId,
  })
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
}

const sendForSign = async ({
  project,
  orgMember,
  orgSlug,
  requirementId,
  recipients,
}: {
  project: Project
  orgMember: ActiveMember
  orgSlug: string
  requirementId: string
  recipients: string[]
}) => {
  const settings = await projectsService.getSettings(
    project.organizationId,
    project.id
  )
  if (settings.clientInvolvement.requirements === 'off') {
    throw new Error(
      'Client involvement is disabled for requirements in this project'
    )
  }
  const requirement = await getById({
    role: orgMember.role as Role,
    projectId: project.id,
    requirementId,
  })
  if (!requirement) {
    throw new Error('Requirement not found')
  }

  await db.transaction(async (tx) => {
    await tx
      .update(requirements)
      .set({ status: 'submitted_to_client' })
      .where(eq(requirements.id, requirementId))
    const recipientsToSend: { email: string; name: string }[] = []
    for (const recipient of recipients) {
      const clientMember = await teamService.getClientMemberById(
        project.organizationId,
        recipient
      )
      if (!clientMember) {
        continue
      }
      recipientsToSend.push({
        email: clientMember.users.email,
        name: clientMember.users.name,
      })
      await tx
        .insert(requirementRecipients)
        .values({
          requirementId,
          clientMemberId: clientMember.members.id,
        })
        .onConflictDoNothing()
    }

    await sendEmailsToRecipients(recipientsToSend, async (recipient) => {
      const html = await render(
        RequirementSentForSignEmail({
          recipientName: recipient.name ?? 'there',
          requirementTitle: requirement.title,
          projectName: project.name,
          senderName: orgMember.user.name ?? 'there',
          orgSlug,
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
  })

  return requirement
}

const sign = async ({
  project,
  orgMember,
  orgSlug,
  requirementId,
  mediaId,
}: {
  project: Project
  orgMember: ActiveMember
  orgSlug: string
  requirementId: string
  mediaId: string
}) => {
  const settings = await projectsService.getSettings(
    project.organizationId,
    project.id
  )
  if (settings.clientInvolvement.requirements === 'off') {
    throw new Error(
      'Client involvement is disabled for requirements in this project'
    )
  }
  const requirement = await getById({
    role: orgMember.role as Role,
    projectId: project.id,
    requirementId,
  })
  if (!requirement) {
    throw new Error('Requirement not found')
  }
  if (requirement.status !== 'submitted_to_client') {
    throw new Error('Requirement is not pending signature')
  }
  const recipients = await getRecipients(requirementId)
  const isRecipient = recipients.some((r) => r.clientMemberId === orgMember.id)
  if (!isRecipient) {
    throw new Error('You are not a recipient of this requirement')
  }
  const existingSignatures = await getSignatures(requirementId)
  if (existingSignatures.some((s) => s.clientMemberId === orgMember.id)) {
    throw new Error('You have already signed this requirement')
  }

  await db.transaction(async (tx) => {
    await tx.insert(requirementSignaturesTable).values({
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

    const admins = await teamService.getAdminAndOwners(project.organizationId)
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
          signedAt: new Date().toLocaleDateString(undefined, {
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
}

const createThread = async ({
  project,
  orgMember,
  orgSlug,
  requirementId,
  selectedText,
  threadBody,
}: {
  project: Project
  orgMember: ActiveMember
  orgSlug: string
  requirementId: string
  selectedText: string
  threadBody: string
}) => {
  const requirement = await getById({
    role: orgMember.role as Role,
    projectId: project.id,
    requirementId,
  })
  if (!requirement) {
    throw new Error('Requirement not found')
  }
  const thread = await db.transaction(async (tx) => {
    const [createdThread] = await tx
      .insert(threadsTable)
      .values({
        projectId: project.id,
        entityId: requirementId,
        selectedText,
        createdByMemberId: orgMember.id,
      })
      .returning()
    const receipients = await teamService.getAdminAndOwners(
      project.organizationId
    )
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
          threadLink: `${baseUrl}/${orgSlug}/${project.slug}/requirements/${requirement.slug}#thread_${createdThread!.id}`,
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
    await tx.insert(threadMessagesTable).values({
      threadId: createdThread!.id,
      body: threadBody,
      authorMemberId: orgMember.id,
    })
    return createdThread
  })
  return thread ?? null
}

const requestChanges = async ({
  project,
  orgMember,
  orgSlug,
  requirementId,
  description,
  referencedThreadIds,
}: {
  project: Project
  orgMember: ActiveMember
  orgSlug: string
  requirementId: string
  description?: string
  referencedThreadIds?: string[]
}) => {
  const settings = await projectsService.getSettings(
    project.organizationId,
    project.id
  )
  if (settings.clientInvolvement.requirements === 'off') {
    throw new Error(
      'Client involvement is disabled for requirements in this project'
    )
  }
  const requirement = await getById({
    role: orgMember.role as Role,
    projectId: project.id,
    requirementId,
  })
  if (!requirement) {
    throw new Error('Requirement not found')
  }
  const [recipientRow] = await db
    .select({ id: requirementRecipientsTable.id })
    .from(requirementRecipientsTable)
    .where(
      and(
        eq(requirementRecipientsTable.requirementId, requirementId),
        eq(requirementRecipientsTable.clientMemberId, orgMember.id)
      )
    )
    .limit(1)
  if (!recipientRow) {
    throw new Error('You are not a recipient of this requirement')
  }
  await db.transaction(async (tx) => {
    await tx.insert(requirementChangeRequestsTable).values({
      requirementId,
      description: description ?? '',
      referencedThreadIds,
      requestedByMemberId: orgMember.id,
    })
    await tx
      .update(requirements)
      .set({ status: 'changes_requested' })
      .where(eq(requirements.id, requirementId))
    const receipients = await teamService.getAdminAndOwners(
      project.organizationId
    )
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
}

const resolveChangeRequest = async ({
  project,
  orgMember,
  requirementId,
  changeRequestId,
  resolution,
}: {
  project: Project
  orgMember: ActiveMember
  requirementId: string
  changeRequestId: string
  resolution: 'accepted' | 'rejected'
}) => {
  const requirement = await getById({
    role: orgMember.role as Role,
    projectId: project.id,
    requirementId,
  })
  if (!requirement) {
    throw new Error('Requirement not found')
  }
  const changeRequest = await getChangeRequestById(
    changeRequestId,
    requirementId
  )
  if (!changeRequest) {
    throw new Error('Change request not found')
  }
  const settings = await projectsService.getSettings(
    project.organizationId,
    project.id
  )
  if (settings.clientInvolvement.requirements === 'off') {
    throw new Error(
      'Client involvement is disabled for requirements in this project'
    )
  }
  const [updatedChangeRequest] = await db
    .update(requirementChangeRequestsTable)
    .set({ status: resolution, resolvedAt: new Date() })
    .returning()
    .where(eq(requirementChangeRequestsTable.id, changeRequestId))
  return updatedChangeRequest
}

const addThreadReply = async ({
  project,
  orgMember,
  orgSlug,
  requirementId,
  threadId,
  replyBody,
}: {
  project: Project
  orgMember: ActiveMember
  orgSlug: string
  requirementId: string
  threadId: string
  replyBody: string
}) => {
  const requirement = await getById({
    role: orgMember.role as Role,
    projectId: project.id,
    requirementId,
  })
  if (!requirement) {
    throw new Error('Requirement not found')
  }
  const thread = await getThreadById(threadId, project.id)
  if (!thread) {
    throw new Error('Thread not found')
  }
  const threadMessage = await db.transaction(async (tx) => {
    const [createdMessage] = await tx
      .insert(threadMessagesTable)
      .values({
        threadId,
        body: replyBody,
        authorMemberId: orgMember.id,
      })
      .returning()
    const receipients = await teamService.getAdminAndOwners(
      project.organizationId
    )
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
    return createdMessage
  })
  return threadMessage
}

export const requirementsService = {
  listByProject,
  getById,
  getBySlug,
  getThreads,
  getRecipients,
  getSignatures,
  getSignatureMediaForMember,
  getChangeRequests,
  getChangeRequestById,
  getThreadById,
  create,
  update,
  sendForSign,
  sign,
  createThread,
  requestChanges,
  resolveChangeRequest,
  addThreadReply,
}
