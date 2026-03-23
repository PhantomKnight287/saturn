import { and, desc, eq, notInArray } from 'drizzle-orm'
import { db } from '@/server/db'
import { media, members, users } from '@/server/db/schema'

const listByOrganization = async (organizationId: string) => {
  return await db
    .select()
    .from(media)
    .where(eq(media.organizationId, organizationId))
    .orderBy(desc(media.createdAt))
}

const listImagesByOrganization = async (organizationId: string) => {
  return await db
    .select({
      id: media.id,
      name: media.name,
      url: media.url,
      contentType: media.contentType,
      createdAt: media.createdAt,
    })
    .from(media)
    .where(
      and(
        eq(media.organizationId, organizationId),
        notInArray(members.role, ['client'])
      )
    )
    .innerJoin(members, eq(media.uploadedByMemberId, members.id))
    .innerJoin(users, eq(members.userId, users.id))
    .orderBy(desc(media.createdAt))
}

const getMediaItemByUrl = async (url: string, organizationId: string) => {
  const [mediaItem] = await db
    .select()
    .from(media)
    .where(and(eq(media.url, url), eq(media.organizationId, organizationId)))
  return mediaItem
}
export const mediaService = {
  listByOrganization,
  listImagesByOrganization,
  getMediaItemByUrl,
}
