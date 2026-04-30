import type { teamService } from '@/app/api/teams/service'
import type { auth } from '@/server/auth'

export type OrgTeamWithMembers = Awaited<
  ReturnType<typeof teamService.getOrgTeamsWithMembers>
>[number]

export type OrgMember = Awaited<
  ReturnType<typeof teamService.getOrgMembers>
>[number]

export type PendingInvitation = Awaited<
  ReturnType<typeof auth.api.listInvitations>
>[number]

export interface TeamsPageClientProps {
  canManage: boolean
  currentMemberId: string
  defaultCurrency: string
  defaultMemberRate: number
  invitations: Awaited<ReturnType<typeof auth.api.listInvitations>>
  members: Awaited<ReturnType<typeof teamService.getOrgMembers>>
  organizationId: string
  orgSlug: string
  teams: OrgTeamWithMembers[]
}
