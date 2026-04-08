import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { resolveProjectContext } from '@/app/(organization)/[org]/cache'
import { teamService } from '@/app/api/teams/service'
import { auth } from '@/server/auth'
import { TeamPageClient } from './page.client'

import { createMetadata } from '@/lib/metadata'
import type { Metadata } from 'next'

export const metadata: Metadata = createMetadata({
  openGraph: {
    images: ['/api/og?page=Team'],
  },
  twitter: {
    images: ['/api/og?page=Team'],
  },
})

export default async function TeamPage({
  params,
}: PageProps<'/[org]/[project]/team'>) {
  const { org, project: projectSlug } = await params
  const {
    organization,
    project: currentProject,
    orgMember,
    role,
  } = await resolveProjectContext(org, projectSlug)

  if (!['owner', 'admin', 'member'].includes(orgMember.role)) {
    redirect(
      `/error?message=${encodeURIComponent('You do not have permission to view the team')}`
    )
  }

  const canManage = role.authorize({ member: ['create'] }).success

  const [projectMembers, projectClients, projectTeams, orgTeams, invitations] =
    await Promise.all([
      teamService.getProjectMembers(currentProject.id),
      teamService.getProjectClients(currentProject.id),
      teamService.getProjectTeams(currentProject.id),
      teamService.getOrgTeams(organization.id),
      canManage
        ? auth.api.listInvitations({
            headers: await headers(),
            query: { organizationId: organization.id },
          })
        : Promise.resolve([]),
    ])

  const pendingInvitations = (invitations ?? [])
    .filter((i: { status: string }) => i.status === 'pending')
    .map(
      (i: {
        id: string
        email: string
        role: string
        status: string
        expiresAt: Date
      }) => ({
        id: i.id,
        email: i.email,
        role: i.role,
        status: i.status,
        expiresAt: i.expiresAt,
      })
    )

  return (
    <TeamPageClient
      canManage={canManage}
      organizationId={organization.id}
      orgSlug={org}
      orgTeams={orgTeams}
      pendingInvitations={pendingInvitations}
      projectClients={projectClients}
      projectId={currentProject.id}
      projectMembers={projectMembers}
      projectSlug={projectSlug}
      projectTeams={projectTeams}
    />
  )
}
