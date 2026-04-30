import type { teamService } from '@/app/api/teams/service'
import type { auth } from '@/server/auth'

export type ProjectMember = Awaited<
  ReturnType<typeof teamService.getProjectMembers>
>[number]

export type ProjectClient = Awaited<
  ReturnType<typeof teamService.getProjectClients>
>[number]

export type ProjectTeam = Awaited<
  ReturnType<typeof teamService.getProjectTeams>
>[number]

export type OrgMember = Awaited<
  ReturnType<typeof teamService.getOrgMembers>
>[number]

export type OrgTeam = Awaited<
  ReturnType<typeof teamService.getOrgTeams>
>[number]

export type PendingInvitation = Awaited<
  ReturnType<typeof auth.api.listInvitations>
>[number]

export interface TeamPageClientProps {
  canManage: boolean
  defaultCurrency: string
  defaultMemberRate: number
  organizationId: string
  orgMembers: OrgMember[]
  orgSlug: string
  orgTeams: OrgTeam[]
  pendingInvitations: PendingInvitation[]
  projectClients: ProjectClient[]
  projectId: string
  projectMembers: ProjectMember[]
  projectSlug: string
  projectTeams: ProjectTeam[]
}
