import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { projectsService } from '@/app/api/projects/service'
import { teamService } from '@/app/api/teams/service'
import { createMetadata } from '@/lib/metadata'
import { auth } from '@/server/auth'
import { resolveOrgContext } from '../cache'
import { ClientsPageClient } from './page.client'
import type { PendingInvitation } from './types'

export const metadata: Metadata = createMetadata({
  title: 'Clients',
  description: 'Manage client relationships and project access.',
  openGraph: {
    images: ['/api/og?page=Clients'],
  },
  twitter: {
    images: ['/api/og?page=Clients'],
  },
})

export default async function ClientsPage({
  params,
}: PageProps<'/[org]/clients'>) {
  const { org } = await params
  const { organization, role } = await resolveOrgContext(org)

  if (!role.authorize({ member: ['create'] }).success) {
    redirect(
      `/error?message=${encodeURIComponent('You do not have permission to view clients')}`
    )
  }

  const canManage = role.authorize({ member: ['create'] }).success

  const [clients, orgProjects, invitationsResult] = await Promise.all([
    teamService.getOrgClients(organization.id),
    projectsService.listByOrganization(organization.id),
    canManage
      ? auth.api.listInvitations({
          headers: await headers(),
          query: { organizationId: organization.id },
        })
      : Promise.resolve([]),
  ])

  const pendingInvitations: PendingInvitation[] = (invitationsResult ?? [])
    .filter((i) => i.status === 'pending' && i.role === 'client')
    .map((i) => ({
      id: i.id,
      email: i.email,
      role: i.role ?? 'client',
      status: i.status,
      expiresAt: i.expiresAt,
    }))

  const projects = orgProjects.map((p) => ({
    projectId: p.id,
    projectName: p.name,
    projectSlug: p.slug,
  }))

  return (
    <ClientsPageClient
      canManage={canManage}
      clients={clients}
      invitations={pendingInvitations}
      organizationId={organization.id}
      orgSlug={org}
      projects={projects}
    />
  )
}
