import { and, asc, desc, eq, getTableColumns, inArray, not } from 'drizzle-orm'
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

export const proposalsService = {
  listByProject,
  getBySlug,
  getThreads,
  getRecipients,
  getSignatures,
  getSignatureMediaForMember,
  getDeliverables,
}
