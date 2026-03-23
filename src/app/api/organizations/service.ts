import { eq } from 'drizzle-orm'
import { db } from '@/server/db'
import { organizations } from '@/server/db/schema'

const getBySlug = async (slug: string) => {
  const [organization] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.slug, slug))

  return organization
}

export const organizationsService = {
  getBySlug,
}
