import { and, asc, eq, inArray } from 'drizzle-orm'
import { db } from '@/server/db'
import { members, threadMessages, threads, users } from '@/server/db/schema'

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
    .leftJoin(members, eq(threadMessages.authorMemberId, members.id))
    .leftJoin(users, eq(members.userId, users.id))
    .where(inArray(threadMessages.threadId, threadIds))
    .orderBy(asc(threadMessages.createdAt))

  const messagesByThread = new Map<string, typeof messages>()
  for (const msg of messages) {
    const list = messagesByThread.get(msg.threadId) ?? []
    list.push(msg)
    messagesByThread.set(msg.threadId, list)
  }

  // Get creator info
  const creatorIds = rows
    .map((t) => t.createdByMemberId)
    .filter((id): id is string => id != null)
  const creators =
    creatorIds.length > 0
      ? await db
          .select({
            memberId: members.id,
            name: users.name,
            image: users.image,
          })
          .from(members)
          .leftJoin(users, eq(members.userId, users.id))
          .where(inArray(members.id, creatorIds))
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

export const threadService = {
  getThreads,
}
