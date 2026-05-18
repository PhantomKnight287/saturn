import { and, asc, eq, isNull } from 'drizzle-orm'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { resolveProjectContext } from '@/app/(organization)/[org]/cache'
import { projectsService } from '@/app/api/projects/service'
import type { CustomFieldDefinition } from '@/lib/custom-fields'

import { createMetadata } from '@/lib/metadata'
import { db } from '@/server/db'
import { customFields } from '@/server/db/schema'
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

  const projectFieldRows = await db
    .select()
    .from(customFields)
    .where(eq(customFields.projectId, project.id))
    .orderBy(asc(customFields.createdAt))
  const orgFieldRows = await db
    .select()
    .from(customFields)
    .where(
      and(
        eq(customFields.organizationId, organization.id),
        isNull(customFields.projectId)
      )
    )
    .orderBy(asc(customFields.createdAt))

  const toDef = (
    r: (typeof projectFieldRows)[number]
  ): CustomFieldDefinition => ({
    id: r.id,
    organizationId: r.organizationId,
    projectId: r.projectId,
    label: r.label,
    type: r.type,
    required: r.required,
    visibleToClient: r.visibleToClient,
    defaultValue: r.defaultValue,
    options: r.options,
    config: r.config,
    createdAt: r.createdAt,
  })

  return (
    <ProjectSettingsPageClient
      canDelete={canDelete}
      organizationId={organization.id}
      orgCustomFields={orgFieldRows.map(toDef)}
      orgSlug={org}
      project={{
        id: project.id,
        name: project.name,
        slug: project.slug,
        dueDate: project.dueDate ? new Date(project.dueDate) : null,
      }}
      projectCustomFields={projectFieldRows.map(toDef)}
      settings={settings}
    />
  )
}
