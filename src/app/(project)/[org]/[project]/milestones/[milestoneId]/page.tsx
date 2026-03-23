import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { resolveProjectContext } from '@/app/(organization)/[org]/cache'
import { milestonesService } from '@/app/api/milestones/service'
import { requirementsService } from '@/app/api/requirements/service'
import { MilestoneDetailClient } from './page.client'

export default async function MilestoneDetail({
  params,
}: PageProps<'/[org]/[project]/milestones/[milestoneId]'>) {
  const { org, project: projectSlug, milestoneId } = await params
  const { project: currentProject, role } = await resolveProjectContext(
    org,
    projectSlug
  )

  if (!role.authorize({ milestone: ['read'] }).success) {
    redirect(
      `/error?message=${encodeURIComponent('You do not have permission to view milestones')}`
    )
  }

  const milestone = await milestonesService.getById(
    milestoneId,
    currentProject.id
  )

  if (!milestone) {
    redirect(`/error?message=${encodeURIComponent('Milestone not found')}`)
  }

  const [linkedRequirements, progress, allRequirements] = await Promise.all([
    milestonesService.getLinkedRequirements(milestoneId),
    milestonesService.getProgress(milestoneId),
    requirementsService.listByProject(currentProject.id, await headers()),
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
      linkedRequirements={linkedRequirements}
      milestone={milestone}
      orgSlug={org}
      progress={progress}
      projectSlug={projectSlug}
    />
  )
}
