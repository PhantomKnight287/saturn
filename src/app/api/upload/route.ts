import { NextResponse } from 'next/server'
import { getSession } from '@/server/auth'
import { db } from '@/server/db'
import { media } from '@/server/db/schema'
import { s3Service } from '@/services/s3.service'

const MAX_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
]

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: 'File type not allowed. Use JPEG, PNG, GIF, WebP, or SVG.' },
      { status: 400 }
    )
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: 'File too large. Maximum size is 5MB.' },
      { status: 400 }
    )
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const { key } = await s3Service.upload(
    buffer,
    file.type,
    `uploads/${session.user.id}`
  )

  const [mediaRecord] = await db
    .insert(media)
    .values({
      name: file.name,
      key,
      contentType: file.type,
      size: file.size,
      userId: session.user.id,
    })
    .returning({ id: media.id })

  return NextResponse.json({ id: mediaRecord!.id })
}
