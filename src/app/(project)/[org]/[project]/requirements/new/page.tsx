import { redirect } from 'next/navigation'
import { resolveProjectContext } from '@/app/(organization)/[org]/cache'
import type { Role } from '@/types'
import RequirementEditor from '../_components/requirement-editor'

export default async function NewRequirement({
  params,
}: PageProps<'/[org]/[project]/requirements/new'>) {
  const { org, project: projectSlug } = await params
  const {
    project: currentProject,
    role,
    orgMember,
  } = await resolveProjectContext(org, projectSlug)

  if (!role.authorize({ requirement: ['create'] }).success) {
    redirect(
      `/error?message=${encodeURIComponent('You do not have permission to create requirements')}`
    )
  }

  return (
    <RequirementEditor
      mode='create'
      orgSlug={org}
      projectId={currentProject.id}
      projectName={currentProject.name}
      projectSlug={projectSlug}
      role={orgMember.role as Role}
    />
  )
}
