import { render } from '@react-email/components'
import { and, asc, desc, eq, getTableColumns, inArray, not } from 'drizzle-orm'
import { organizationsService } from '@/app/api/organizations/service'
import { projectsService } from '@/app/api/projects/service'
import { teamService } from '@/app/api/teams/service'
import ProposalApprovedEmail from '@/emails/templates/proposal-approved'
import ProposalSentEmail from '@/emails/templates/proposal-sent'
import ThreadNewMessageEmail from '@/emails/templates/thread-new-message'
import { baseUrl } from '@/lib/metadata'
import { sendEmailsToRecipients } from '@/lib/notifications'
import { titleToSlug } from '@/lib/utils'
import type { ActiveMember, Project } from '@/server/access/project-access'
import { db } from '@/server/db'
import {
  media as mediaTable,
  members as membersTable,
  proposalDeliverables,
  proposalRecipients,
  proposalSignatures,
  proposals,
  threadMessages,
  threads,
  users,
} from '@/server/db/schema'
import type { Role } from '@/types'

export const PROPOSALS_CACHE_TAG = 'proposals'

// The editor sends `description`, which is persisted as the deliverable's
// `title`; the numeric fields map straight through.
type Deliverable = Pick<
  typeof proposalDeliverables.$inferInsert,
  'amount' | 'quantity' | 'unitPrice'
> & { description: string }

const getById = async (proposalId: string, projectId: string) => {
  const [proposal] = await db
    .select()
    .from(proposals)
    .where(
      and(eq(proposals.id, proposalId), eq(proposals.projectId, projectId))
    )
  return proposal ?? null
}

const calculateTotal = (deliverables?: Deliverable[]): string => {
  if (!deliverables || deliverables.length === 0) {
    return '0'
  }
  return deliverables
    .reduce((sum, d) => sum + Number.parseFloat(d.amount || '0'), 0)
    .toFixed(4)
}

const listByProject = async ({
  memberId,
  projectId,
  role,
}: {
  projectId: string
  memberId: string
  role: Role
}) => {
  if (role === 'client') {
    return await db
      .select(getTableColumns(proposals))
      .from(proposals)
      .where(
        and(
          eq(proposals.projectId, projectId),
          not(eq(proposals.status, 'draft'))
        )
      )
      .innerJoin(
        proposalRecipients,
        and(
          eq(proposalRecipients.proposalId, proposals.id),
          eq(proposalRecipients.clientMemberId, memberId)
        )
      )
      .orderBy(desc(proposals.updatedAt))
  }
  return db
    .select()
    .from(proposals)
    .where(eq(proposals.projectId, projectId))
    .orderBy(desc(proposals.updatedAt))
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
  let proposal: typeof proposals.$inferSelect | undefined
  if (role === 'client') {
    const proposalArray = await db
      .select(getTableColumns(proposals))
      .from(proposals)
      .where(and(eq(proposals.projectId, projectId), eq(proposals.slug, slug)))
      .innerJoin(
        proposalRecipients,
        and(
          eq(proposalRecipients.proposalId, proposals.id),
          eq(proposalRecipients.clientMemberId, memberId)
        )
      )
    proposal = proposalArray[0]
  } else {
    const proposalArray = await db
      .select()
      .from(proposals)
      .where(and(eq(proposals.projectId, projectId), eq(proposals.slug, slug)))
    proposal = proposalArray[0]
  }
  return proposal ?? null
}

const getDeliverables = async (proposalId: string) =>
  await db
    .select()
    .from(proposalDeliverables)
    .where(eq(proposalDeliverables.proposalId, proposalId))
    .orderBy(asc(proposalDeliverables.sortOrder))

const getThreads = async (projectId: string, entityId: string) => {
  const rows = await db
    .select()
    .from(threads)
    .where(
      and(eq(threads.projectId, projectId), eq(threads.entityId, entityId))
    )
    .orderBy(asc(threads.createdAt))

  const threadIds = rows.map((t) => t.id)
  if (threadIds.length === 0) {
    return []
  }

  const messages = await db
    .select({
      id: threadMessages.id,
      threadId: threadMessages.threadId,
      authorMemberId: threadMessages.authorMemberId,
      authorName: users.name,
      authorImage: users.image,
      body: threadMessages.body,
      createdAt: threadMessages.createdAt,
    })
    .from(threadMessages)
    .leftJoin(membersTable, eq(threadMessages.authorMemberId, membersTable.id))
    .leftJoin(users, eq(membersTable.userId, users.id))
    .where(inArray(threadMessages.threadId, threadIds))
    .orderBy(asc(threadMessages.createdAt))

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
const getRecipients = async (proposalId: string) =>
  await db
    .select()
    .from(proposalRecipients)
    .where(eq(proposalRecipients.proposalId, proposalId))

const getSignatures = async (proposalId: string) =>
  await db
    .select({
      id: proposalSignatures.id,
      proposalId: proposalSignatures.proposalId,
      clientMemberId: proposalSignatures.clientMemberId,
      signedAt: proposalSignatures.signedAt,
      mediaId: proposalSignatures.mediaId,
      signerName: users.name,
      signerImage: users.image,
    })
    .from(proposalSignatures)
    .leftJoin(mediaTable, eq(proposalSignatures.mediaId, mediaTable.id))
    .leftJoin(
      membersTable,
      eq(proposalSignatures.clientMemberId, membersTable.id)
    )
    .leftJoin(users, eq(membersTable.userId, users.id))
    .where(eq(proposalSignatures.proposalId, proposalId))

const getSignatureMediaForMember = async (memberId: string) =>
  await db
    .select({
      id: mediaTable.id,
      name: mediaTable.name,
      contentType: mediaTable.contentType,
      createdAt: mediaTable.createdAt,
    })
    .from(proposalSignatures)
    .innerJoin(mediaTable, eq(proposalSignatures.mediaId, mediaTable.id))
    .where(eq(proposalSignatures.clientMemberId, memberId))
    .groupBy(mediaTable.id)
    .orderBy(desc(mediaTable.createdAt))

const create = async ({
  project,
  authorId,
  title,
  body,
  terms,
  validUntil,
  currency,
  deliverables,
}: {
  project: Project
  authorId: string
  title: string
  body?: string
  terms?: string
  validUntil?: string
  currency: string
  deliverables?: Deliverable[]
}) => {
  const settings = await projectsService.getSettings(
    project.organizationId,
    project.id
  )
  const { slugified, slugifiedWithSuffix } = titleToSlug(title)
  const [proposalWithSlug] = await db
    .select({ id: proposals.id })
    .from(proposals)
    .where(
      and(eq(proposals.projectId, project.id), eq(proposals.slug, slugified))
    )

  return await db.transaction(async (tx) => {
    const [proposal] = await tx
      .insert(proposals)
      .values({
        projectId: project.id,
        authorId,
        title,
        slug: proposalWithSlug ? slugifiedWithSuffix : slugified,
        body: body || '',
        terms: terms || null,
        validUntil: validUntil || null,
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
}

const update = async ({
  project,
  proposalId,
  title,
  body,
  terms,
  validUntil,
  currency,
  deliverables,
}: {
  project: Project
  proposalId: string
  title: string
  body?: string
  terms?: string
  validUntil?: string
  currency?: string
  deliverables?: Deliverable[]
}) => {
  const settings = await projectsService.getSettings(
    project.organizationId,
    project.id
  )
  const proposal = await getById(proposalId, project.id)
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

  return await db.transaction(async (tx) => {
    const [updatedProposal] = await tx
      .update(proposals)
      .set({
        title,
        body,
        terms: terms || null,
        validUntil: validUntil || null,
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
}

const send = async ({
  project,
  orgMember,
  orgSlug,
  proposalId,
  recipients,
}: {
  project: Project
  orgMember: ActiveMember
  orgSlug: string
  proposalId: string
  recipients: string[]
}) => {
  const organization = await organizationsService.getBySlug(orgSlug)
  if (!organization) {
    throw new Error('Organization not found')
  }
  const settings = await projectsService.getSettings(
    project.organizationId,
    project.id
  )
  if (settings.clientInvolvement.proposals === 'off') {
    throw new Error(
      'Client involvement is disabled for proposals in this project'
    )
  }
  const proposal = await getById(proposalId, project.id)
  if (!proposal) {
    throw new Error('Proposal not found')
  }

  await db.transaction(async (tx) => {
    await tx
      .update(proposals)
      .set({ status: 'submitted_to_client' })
      .where(eq(proposals.id, proposalId))

    const recipientsToSend: {
      email: string
      name: string
      memberId: string
    }[] = []
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
        memberId: clientMember.members.id,
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
            ? new Date(`${proposal.validUntil}T00:00:00`).toLocaleDateString(
                'en-GB',
                {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                }
              )
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
        recipientsToSend.map(({ memberId }) => ({
          proposalId,
          clientMemberId: memberId,
        }))
      )
      .onConflictDoNothing()
  })

  return proposal
}

const sign = async ({
  project,
  orgMember,
  orgSlug,
  proposalId,
  mediaId,
}: {
  project: Project
  orgMember: ActiveMember
  orgSlug: string
  proposalId: string
  mediaId: string
}) => {
  const settings = await projectsService.getSettings(
    project.organizationId,
    project.id
  )
  if (settings.clientInvolvement.proposals === 'off') {
    throw new Error(
      'Client involvement is disabled for proposals in this project'
    )
  }
  const proposal = await getById(proposalId, project.id)
  if (!proposal) {
    throw new Error('Proposal not found')
  }
  if (proposal.status !== 'submitted_to_client') {
    throw new Error('Proposal is not pending signature')
  }
  const recipients = await getRecipients(proposalId)
  const isRecipient = recipients.some((r) => r.clientMemberId === orgMember.id)
  if (!isRecipient) {
    throw new Error('You are not a recipient of this proposal')
  }
  const existingSignatures = await getSignatures(proposalId)
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
}

const createThread = async ({
  project,
  orgMember,
  orgSlug,
  proposalId,
  selectedText,
  threadBody,
}: {
  project: Project
  orgMember: ActiveMember
  orgSlug: string
  proposalId: string
  selectedText: string
  threadBody: string
}) => {
  const proposal = await getById(proposalId, project.id)
  if (!proposal) {
    throw new Error('Proposal not found')
  }
  const thread = await db.transaction(async (tx) => {
    const [createdThread] = await tx
      .insert(threads)
      .values({
        projectId: project.id,
        entityId: proposalId,
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
          contextName: proposal.title,
          contextType: 'proposal',
          projectName: project.name,
          orgSlug,
          projectSlug: project.slug,
          threadLink: `${baseUrl}/${orgSlug}/${project.slug}/proposals/${proposal.slug}#thread_${createdThread!.id}`,
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
      threadId: createdThread!.id,
      body: threadBody,
      authorMemberId: orgMember.id,
    })
    return createdThread
  })
  return thread ?? null
}

const addThreadReply = async ({
  project,
  orgMember,
  orgSlug,
  proposalId,
  threadId,
  replyBody,
}: {
  project: Project
  orgMember: ActiveMember
  orgSlug: string
  proposalId: string
  threadId: string
  replyBody: string
}) => {
  const proposal = await getById(proposalId, project.id)
  if (!proposal) {
    throw new Error('Proposal not found')
  }
  const [thread] = await db
    .select()
    .from(threads)
    .where(and(eq(threads.id, threadId), eq(threads.projectId, project.id)))
  if (!thread) {
    throw new Error('Thread not found')
  }
  const threadMessage = await db.transaction(async (tx) => {
    const [createdMessage] = await tx
      .insert(threadMessages)
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
    return createdMessage
  })
  return threadMessage
}

const decline = async ({
  project,
  orgMember,
  proposalId,
}: {
  project: Project
  orgMember: ActiveMember
  proposalId: string
}) => {
  const settings = await projectsService.getSettings(
    project.organizationId,
    project.id
  )
  if (settings.clientInvolvement.proposals === 'off') {
    throw new Error(
      'Client involvement is disabled for proposals in this project'
    )
  }
  const proposal = await getById(proposalId, project.id)
  if (!proposal) {
    throw new Error('Proposal not found')
  }
  if (proposal.status !== 'submitted_to_client') {
    throw new Error('Proposal is not pending client review')
  }
  const recipients = await getRecipients(proposalId)
  const isRecipient = recipients.some((r) => r.clientMemberId === orgMember.id)
  if (!isRecipient) {
    throw new Error('You are not a recipient of this proposal')
  }

  await db
    .update(proposals)
    .set({ status: 'client_rejected' })
    .where(eq(proposals.id, proposalId))

  return { success: true }
}

const remove = async (proposalId: string, projectId: string) => {
  const proposal = await getById(proposalId, projectId)
  if (!proposal) {
    throw new Error('Proposal not found')
  }
  await db.delete(proposals).where(eq(proposals.id, proposalId))
  return { success: true }
}

export const proposalsService = {
  listByProject,
  getById,
  getBySlug,
  getThreads,
  getRecipients,
  getSignatures,
  getSignatureMediaForMember,
  getDeliverables,
  create,
  update,
  send,
  sign,
  createThread,
  addThreadReply,
  decline,
  remove,
}
