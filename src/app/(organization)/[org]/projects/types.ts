import type { projects } from '@/server/db/schema'

export type Project = typeof projects.$inferSelect

export interface ProjectsClientProps {
  canCreate: boolean
  organizationId: string
  orgSlug: string
  projects: Project[]
  openNewProjectDialog:boolean
}
