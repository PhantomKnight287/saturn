import type { teamService } from '@/app/api/teams/service'

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

export interface OrgTeam {
  teamId: string
  teamName: string
}

export interface PendingInvitation {
  email: string
  expiresAt: Date
  id: string
  role: string
  status: string
}

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
