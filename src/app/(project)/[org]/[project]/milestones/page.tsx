import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { resolveProjectContext } from '@/app/(organization)/[org]/cache'
import { milestonesService } from '@/app/api/milestones/service'
import { projectsService } from '@/app/api/projects/service'
import { createMetadata } from '@/lib/metadata'
import { MilestonesClient } from './page.client'
import { headers } from 'next/headers'

export const metadata: Metadata = createMetadata({
  title: 'Milestones',
  description: 'Track project milestones and deliverables.',
  openGraph: {
    images: ['/api/og?page=Milestones'],
  },
  twitter: {
    images: ['/api/og?page=Milestones'],
  },
})

export default async function Milestones({
  params,
}: PageProps<'/[org]/[project]/milestones'>) {
  const { org, project: projectSlug } = await params
  const {
    project: currentProject,
    role,
    organization,
  } = await resolveProjectContext(org, projectSlug)

  if (!role.authorize({ milestone: ['read'] }).success) {
    redirect(
      `/error/403?message=${encodeURIComponent('You do not have permission to view milestones')}`
    )
  }

  const milestoneList = await milestonesService.listByProjectWithProgress(
    currentProject.id
  )

  const canCreate = role.authorize({ milestone: ['create'] }).success
  const canUpdate = role.authorize({ milestone: ['update'] }).success
  const canComplete = role.authorize({ milestone: ['complete'] }).success
  const canDelete = role.authorize({ milestone: ['delete'] }).success
  const settings = await projectsService.getSettings(
    organization.id,
    currentProject.id
  )

  return (
    <MilestonesClient
      canComplete={canComplete}
      canCreate={canCreate}
      canDelete={canDelete}
      canUpdate={canUpdate}
      defaultCurrency={settings.currency}
      milestones={milestoneList}
      orgSlug={org}
      projectId={currentProject.id}
      projectSlug={projectSlug}
    />
  )
}
