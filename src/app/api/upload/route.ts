import { and, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { getSession } from '@/server/auth'
import { db } from '@/server/db'
import { media, members, projects } from '@/server/db/schema'
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
  const projectId = formData.get('projectId') as string | null

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  if (!projectId) {
    return NextResponse.json(
      { error: 'projectId is required' },
      { status: 400 }
    )
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

  // Verify the project exists and user is a member of its org
  const [project] = await db
    .select({ id: projects.id, organizationId: projects.organizationId })
    .from(projects)
    .where(eq(projects.id, projectId))

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const [member] = await db
    .select({ id: members.id })
    .from(members)
    .where(
      and(
        eq(members.userId, session.user.id),
        eq(members.organizationId, project.organizationId)
      )
    )

  if (!member) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const { key } = await s3Service.upload(
    buffer,
    file.type,
    `uploads/${projectId}`
  )

  const url = `/api/files/${key}`

  // Save to media library for reuse across the organization
  const [mediaRecord] = await db
    .insert(media)
    .values({
      organizationId: project.organizationId,
      uploadedByMemberId: member.id,
      name: file.name,
      key,
      url,
      contentType: file.type,
      size: file.size,
    })
    .returning({ id: media.id })

  // Return the internal URL that goes through our auth-gated files route
  return NextResponse.json({ url, id: mediaRecord!.id })
}
