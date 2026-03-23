import type { teamService } from '@/app/api/teams/service'

export type OrgClient = Awaited<
  ReturnType<typeof teamService.getOrgClients>
>[number]

export interface OrgProject {
  projectId: string
  projectName: string
  projectSlug: string
}

export interface PendingInvitation {
  email: string
  expiresAt: Date
  id: string
  role: string
  status: string
}

export interface ClientsPageClientProps {
  canManage: boolean
  clients: OrgClient[]
  invitations: PendingInvitation[]
  organizationId: string
  orgSlug: string
  projects: OrgProject[]
}
