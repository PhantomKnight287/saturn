import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { teamService } from '@/app/api/teams/service'
import { auth } from '@/server/auth'
import { resolveOrgContext } from '../cache'
import { TeamsPageClient } from './page.client'
import type { PendingInvitation } from './types'

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
      `/error?message=${encodeURIComponent('You do not have permission to view teams')}`
    )
  }

  const canManage = role.authorize({ member: ['create'] }).success

  const [orgMembers, orgTeams, invitationsResult] = await Promise.all([
    teamService.getOrgMembers(organization.id, true),
    teamService.getOrgTeamsWithMembers(organization.id),
    canManage
      ? auth.api.listInvitations({
          headers: await headers(),
          query: { organizationId: organization.id },
        })
      : Promise.resolve([]),
  ])

  const pendingInvitations: PendingInvitation[] = (invitationsResult ?? [])
    .filter((i) => i.status === 'pending')
    .map((i) => ({
      id: i.id,
      email: i.email,
      role: i.role ?? 'member',
      status: i.status,
      expiresAt: i.expiresAt,
    }))

  return (
    <TeamsPageClient
      canManage={canManage}
      currentMemberId={orgMember.id}
      invitations={pendingInvitations}
      members={orgMembers}
      organizationId={organization.id}
      orgSlug={org}
      teams={orgTeams}
    />
  )
}
