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
  organizationId: string
  orgSlug: string
  orgTeams: OrgTeam[]
  pendingInvitations: PendingInvitation[]
  projectClients: ProjectClient[]
  projectId: string
  projectMembers: ProjectMember[]
  projectSlug: string
  projectTeams: ProjectTeam[]
}
