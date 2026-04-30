import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { projectsService } from '@/app/api/projects/service'
import { teamService } from '@/app/api/teams/service'
import { createMetadata } from '@/lib/metadata'
import { auth } from '@/server/auth'
import { requirePermission, resolveOrgContext } from '../cache'
import { ClientsPageClient } from './page.client'

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

  requirePermission(
    role,
    { member: ['create'] },
    'You do not have permission to view clients'
  )

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

  const pendingInvitations = (invitationsResult ?? []).filter(
    (i) => i.status === 'pending' && i.role === 'client'
  )

  return (
    <ClientsPageClient
      canManage={canManage}
      clients={clients}
      invitations={pendingInvitations}
      organizationId={organization.id}
      orgSlug={org}
      projects={orgProjects}
    />
  )
}
