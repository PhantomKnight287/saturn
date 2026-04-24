import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { resolveProjectContext } from '@/app/(organization)/[org]/cache'
import { projectsService } from '@/app/api/projects/service'

import { createMetadata } from '@/lib/metadata'
import { ProjectSettingsPageClient } from './page.client'

export const metadata: Metadata = createMetadata({
  title: 'Project Settings',
  description: 'Configure project preferences, defaults, and access.',
  openGraph: {
    images: ['/api/og?page=Settings'],
  },
  twitter: {
    images: ['/api/og?page=Settings'],
  },
})

export default async function ProjectSettingsPage({
  params,
}: PageProps<'/[org]/[project]/settings'>) {
  const { org, project: projectSlug } = await params
  const { organization, role, project } = await resolveProjectContext(
    org,
    projectSlug
  )

  if (!role.authorize({ organization: ['update'] }).success) {
    redirect(
      `/error/403?message=${encodeURIComponent('You do not have permission to view settings')}`
    )
  }

  const canDelete = role.authorize({ organization: ['delete'] }).success

  const settings = await projectsService.getSettings(
    organization.id,
    project.id
  )

  return (
    <ProjectSettingsPageClient
      canDelete={canDelete}
      organizationId={organization.id}
      orgSlug={org}
      project={{
        id: project.id,
        name: project.name,
        slug: project.slug,
        dueDate: project.dueDate ? new Date(project.dueDate) : null,
      }}
      settings={settings}
    />
  )
}
