import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { resolveProjectContext } from '@/app/(organization)/[org]/cache'
import { milestonesService } from '@/app/api/milestones/service'
import { projectsService } from '@/app/api/projects/service'
import { requirementsService } from '@/app/api/requirements/service'
import { createMetadata } from '@/lib/metadata'
import { MilestoneDetailClient } from './page.client'

export const metadata: Metadata = createMetadata({
  title: 'Milestone',
  description: 'Track milestone progress, requirements, and deliverables.',
  openGraph: {
    images: ['/api/og?page=Milestones'],
  },
  twitter: {
    images: ['/api/og?page=Milestones'],
  },
})

export default async function MilestoneDetail({
  params,
}: PageProps<'/[org]/[project]/milestones/[milestoneId]'>) {
  const { org, project: projectSlug, milestoneId } = await params
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

  const milestone = await milestonesService.getById(
    milestoneId,
    currentProject.id
  )

  if (!milestone) {
    redirect(`/error/404?message=${encodeURIComponent('Milestone not found')}`)
  }

  const [linkedRequirements, progress, allRequirements, settings] =
    await Promise.all([
      milestonesService.getLinkedRequirements(milestoneId),
      milestonesService.getProgress(milestoneId),
      requirementsService.listByProject(currentProject.id, await headers()),
      projectsService.getSettings(organization.id, currentProject.id),
    ])

  const canUpdate = role.authorize({ milestone: ['update'] }).success
  const canComplete = role.authorize({ milestone: ['complete'] }).success
  const canDelete = role.authorize({ milestone: ['delete'] }).success

  return (
    <MilestoneDetailClient
      allRequirements={allRequirements}
      canComplete={canComplete}
      canDelete={canDelete}
      canUpdate={canUpdate}
      isClientInvolvedInRequirements={
        settings.clientInvolvement.requirements === 'on'
      }
      linkedRequirements={linkedRequirements}
      milestone={milestone}
      orgSlug={org}
      progress={progress}
      projectSlug={projectSlug}
    />
  )
}
