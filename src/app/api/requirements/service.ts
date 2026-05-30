import { and, asc, desc, eq, getTableColumns, inArray, not } from 'drizzle-orm'
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
}
