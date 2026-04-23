import { eq } from 'drizzle-orm'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getSession } from '@/server/auth'
import { db } from '@/server/db'
import { media } from '@/server/db/schema'
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

  const signedUrl = await s3Service.getSignedUrl(mediaRecord.key)

  return NextResponse.redirect(signedUrl, {
    status: 302,
    headers: {
      'Cache-Control': 'private, max-age=3500',
    },
  })
}
