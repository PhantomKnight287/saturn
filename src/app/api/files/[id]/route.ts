import { and, eq } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getSession } from '@/server/auth'
import { db } from '@/server/db'
import { media, members } from '@/server/db/schema'
import { s3Service } from '@/services/s3.service'

export async function GET(
  request: NextRequest,
  { params }: RouteContext<'/api/files/[id]'>
) {
  const session = await getSession(request)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const [mediaRecord] = await db.select().from(media).where(eq(media.id, id))
  if (!mediaRecord) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }

  if (mediaRecord.userId !== session.user.id) {
    const authorMembers = alias(members, 'author_members')
    const viewerMembers = alias(members, 'viewer_members')

    const [link] = await db
      .select({ organizationId: authorMembers.organizationId })
      .from(authorMembers)
      .innerJoin(
        viewerMembers,
        eq(authorMembers.organizationId, viewerMembers.organizationId)
      )
      .where(
        and(
          eq(authorMembers.userId, mediaRecord.userId),
          eq(viewerMembers.userId, session.user.id)
        )
      )
      .limit(1)

    if (!link) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const signedUrl = await s3Service.getSignedUrl(mediaRecord.key)

  return NextResponse.redirect(signedUrl, {
    status: 302,
    headers: {
      'Cache-Control': 'private, max-age=3500',
    },
  })
}
