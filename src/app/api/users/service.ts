import { eq } from 'drizzle-orm'
import { db } from '@/server/db'
import { media } from '@/server/db/schema'

const getMedias = async (userId: string) => {
  const mediaFiles = await db
    .select()
    .from(media)
    .where(eq(media.userId, userId))
  return mediaFiles
}

export const usersService = {
  getMedias,
}
