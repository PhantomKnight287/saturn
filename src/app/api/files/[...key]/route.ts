import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getSession } from '@/server/auth'
import { s3Service } from '@/services/s3.service'
import { authService } from '../../auth/service'
import { projectsService } from '../../projects/service'

// Key format: uploads/{projectId}/{filename}
function extractProjectId(segments: string[]): string | null {
  // segments = ["uploads", projectId, "filename.ext"]
  if (segments.length >= 3 && segments[0] === 'uploads') {
    return segments[1]!
  }
  return null
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const session = await getSession(request)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { key: segments } = await params
  const key = segments.join('/')

  const projectId = extractProjectId(segments)
  if (!projectId) {
    return NextResponse.json({ error: 'Invalid file path' }, { status: 400 })
  }

  const project = await projectsService.getById(projectId)
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }
  const access = await authService.checkProjectAccess(
    project!.organizationId,
    projectId,
    session.user.id
  )
  if (access.success === false) {
    return NextResponse.json(
      { error: access.error ?? 'Access denied' },
      { status: 403 }
    )
  }

  // Generate a presigned URL and redirect
  const signedUrl = await s3Service.getSignedUrl(key)

  return NextResponse.redirect(signedUrl, {
    status: 302,
    headers: {
      'Cache-Control': 'private, max-age=3500',
    },
  })
}
