import { redirect } from 'next/navigation'
import { resolveProjectContext } from '@/app/(organization)/[org]/cache'
import { milestonesService } from '@/app/api/milestones/service'
import { MilestonesClient } from './page.client'
import { createMetadata } from '@/lib/metadata'
import type { Metadata } from 'next'

export const metadata: Metadata = createMetadata({
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
  const { project: currentProject, role } = await resolveProjectContext(
    org,
    projectSlug
  )

  if (!role.authorize({ milestone: ['read'] }).success) {
    redirect(
      `/error?message=${encodeURIComponent('You do not have permission to view milestones')}`
    )
  }

  const milestoneList = await milestonesService.listByProjectWithProgress(
    currentProject.id
  )

  const canCreate = role.authorize({ milestone: ['create'] }).success
  const canUpdate = role.authorize({ milestone: ['update'] }).success
  const canComplete = role.authorize({ milestone: ['complete'] }).success
  const canDelete = role.authorize({ milestone: ['delete'] }).success

  return (
    <MilestonesClient
      canComplete={canComplete}
      canCreate={canCreate}
      canDelete={canDelete}
      canUpdate={canUpdate}
      milestones={milestoneList}
      orgSlug={org}
      projectId={currentProject.id}
      projectSlug={projectSlug}
    />
  )
}
