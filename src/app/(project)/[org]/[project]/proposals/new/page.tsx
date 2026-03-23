import { redirect } from 'next/navigation'
import { resolveProjectContext } from '@/app/(organization)/[org]/cache'
import ProposalEditor from '../_components/proposal-editor'

export default async function NewProposal({
  params,
}: PageProps<'/[org]/[project]/proposals/new'>) {
  const { org, project: projectSlug } = await params
  const { project: currentProject, role } = await resolveProjectContext(
    org,
    projectSlug
  )

  if (!role.authorize({ proposal: ['create'] }).success) {
    redirect(
      `/error?message=${encodeURIComponent('You do not have permission to create proposals')}`
    )
  }

  return (
    <ProposalEditor
      mode='create'
      orgSlug={org}
      projectId={currentProject.id}
      projectName={currentProject.name}
      projectSlug={projectSlug}
    />
  )
}
