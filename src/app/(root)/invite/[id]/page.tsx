import { eq } from 'drizzle-orm'
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createMetadata } from '@/lib/metadata'
import { auth } from '@/server/auth'
import { db } from '@/server/db'
import { organizations } from '@/server/db/schema/auth'
import { projectInvitations, projects } from '@/server/db/schema/project'
import { AcceptInviteClient } from './page.client'

export const metadata: Metadata = createMetadata({
  title: 'Accept invitation',
  description: 'Join your team on Saturn.',
  openGraph: {
    images: ['/api/og?page=Invitation'],
  },
  twitter: {
    images: ['/api/og?page=Invitation'],
  },
})

export default async function InvitePage({
  params,
}: PageProps<'/invite/[id]'>) {
  const { id: invitationId } = await params

  let invitation: Awaited<ReturnType<typeof auth.api.getInvitation>>
  try {
    const result = await auth.api.getInvitation({
      headers: await headers(),
      query: { id: invitationId },
    })
    if (!result) {
      redirect(
        `/error/404?message=${encodeURIComponent('Invitation not found')}`
      )
    }
    invitation = result as typeof invitation
  } catch (e) {
    console.error(e)
    redirect(
      `/error/404?message=${encodeURIComponent('Invitation not found or expired')}`
    )
  }

  if (invitation.status !== 'pending') {
    redirect(
      `/error/403?message=${encodeURIComponent('This invitation has already been used')}`
    )
  }

  // Look up org name
  const [org] = await db
    .select({ name: organizations.name, slug: organizations.slug })
    .from(organizations)
    .where(eq(organizations.id, invitation.organizationId))

  // Look up linked project (if any)
  const [projectLink] = await db
    .select({
      projectId: projectInvitations.projectId,
      type: projectInvitations.type,
    })
    .from(projectInvitations)
    .where(eq(projectInvitations.invitationId, invitationId))

  let projectInfo: { name: string; slug: string } | null = null
  if (projectLink) {
    const [p] = await db
      .select({ name: projects.name, slug: projects.slug })
      .from(projects)
      .where(eq(projects.id, projectLink.projectId))
    projectInfo = p ?? null
  }

  const roleLabels: Record<string, string> = {
    owner: 'Owner',
    admin: 'Admin',
    member: 'Team Member',
    client: 'Client',
  }

  return (
    <main className='container flex grow flex-col items-center justify-center self-center p-4 md:p-6'>
      <AcceptInviteClient
        assignmentType={projectLink?.type}
        email={invitation.email}
        invitationId={invitationId}
        organizationName={org?.name ?? 'Unknown workspace'}
        organizationSlug={org?.slug ?? ''}
        projectId={projectLink?.projectId}
        projectName={projectInfo?.name}
        projectSlug={projectInfo?.slug}
        roleLabel={roleLabels[invitation.role] ?? invitation.role}
      />
    </main>
  )
}
