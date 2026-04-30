import type { projectsService } from '@/app/api/projects/service'
import type { teamService } from '@/app/api/teams/service'
import type { auth } from '@/server/auth'

export type OrgClient = Awaited<
  ReturnType<typeof teamService.getOrgClients>
>[number]

export type OrgProject = Awaited<
  ReturnType<typeof projectsService.listByOrganization>
>[number]

export type PendingInvitation = Awaited<
  ReturnType<typeof auth.api.listInvitations>
>[number]

export interface ClientsPageClientProps {
  canManage: boolean
  clients: OrgClient[]
  invitations: Awaited<ReturnType<typeof auth.api.listInvitations>>
  organizationId: string
  orgSlug: string
  projects: OrgProject[]
}
