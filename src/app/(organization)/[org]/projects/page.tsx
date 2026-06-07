import type { Metadata } from 'next'
import { createLoader, parseAsInteger } from 'nuqs/server'
import { projectsService } from '@/app/api/projects/service'
import { createMetadata } from '@/lib/metadata'
import { requirePermission, resolveOrgContext } from '../cache'
import { ProjectsClient } from './page.client'

export const metadata: Metadata = createMetadata({
  title: 'Projects',
  description: "View all of your workspace's projects.",
  openGraph: {
    images: ['/api/og?page=Projects'],
  },
  twitter: {
    images: ['/api/og?page=Projects'],
  },
})

const loadSearchParams = createLoader({
  newProject: parseAsInteger.withDefault(0),
})

export default async function Projects({
  params,
  searchParams,
}: PageProps<'/[org]/projects'>) {
  const { org } = await params
  const { organization, orgMember, role } = await resolveOrgContext(org)
  const { newProject } = await loadSearchParams(searchParams)
  requirePermission(
    role,
    { project: ['read'] },
    'You do not have permission to view projects'
  )

  const canCreate = role.authorize({ project: ['create'] }).success
  const projectList = await projectsService.listAccessible(
    organization.id,
    orgMember
  )

  return (
    <ProjectsClient
      canCreate={canCreate}
      openNewProjectDialog={newProject === 1}
      organizationId={organization.id}
      orgSlug={org}
      projects={projectList}
    />
  )
}
