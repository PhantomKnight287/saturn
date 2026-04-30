import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { projectsService } from '@/app/api/projects/service'
import { teamService } from '@/app/api/teams/service'
import { createMetadata } from '@/lib/metadata'
import { auth } from '@/server/auth'
import { resolveOrgContext } from '../cache'
import { TeamsPageClient } from './page.client'

export const metadata: Metadata = createMetadata({
  title: 'Teams',
  description: 'Manage workspace members, roles, and team groups.',
  openGraph: {
    images: ['/api/og?page=Team'],
  },
  twitter: {
    images: ['/api/og?page=Team'],
  },
})

export default async function TeamsPage({ params }: PageProps<'/[org]/teams'>) {
  const { org } = await params
  const { organization, orgMember, role } = await resolveOrgContext(org)

  if (
    !(
      role.authorize({ member: ['create'] }).success ||
      role.authorize({ team: ['create'] }).success
    )
  ) {
    redirect(
      `/error/403?message=${encodeURIComponent('You do not have permission to view teams')}`
    )
  }

  const canManage = role.authorize({ member: ['create'] }).success

  const [orgMembers, orgTeams, invitationsResult, orgSettings] =
    await Promise.all([
      teamService.getOrgMembers(organization.id, true),
      teamService.getOrgTeamsWithMembers(organization.id),
      canManage
        ? auth.api.listInvitations({
            headers: await headers(),
            query: { organizationId: organization.id },
          })
        : Promise.resolve([]),
      projectsService.getSettings(organization.id),
    ])

  const pendingInvitations = (invitationsResult ?? []).filter(
    (i) => i.status === 'pending' && i.role !== 'client'
  )

  return (
    <TeamsPageClient
      canManage={canManage}
      currentMemberId={orgMember.id}
      defaultCurrency={orgSettings.currency}
      defaultMemberRate={orgSettings.memberRate}
      invitations={pendingInvitations}
      members={orgMembers}
      organizationId={organization.id}
      orgSlug={org}
      teams={orgTeams}
    />
  )
}
