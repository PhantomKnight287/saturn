import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { resolveProjectContext } from '@/app/(organization)/[org]/cache'
import { projectsService } from '@/app/api/projects/service'
import { createMetadata } from '@/lib/metadata'
import ProposalEditor from '../_components/proposal-editor'

export const metadata: Metadata = createMetadata({
  title: 'New Proposal',
  description: 'Draft a new proposal to send to your client.',
  openGraph: {
    images: ['/api/og?page=Proposals'],
  },
  twitter: {
    images: ['/api/og?page=Proposals'],
  },
})

export default async function NewProposal({
  params,
}: PageProps<'/[org]/[project]/proposals/new'>) {
  const { org, project: projectSlug } = await params
  const {
    project: currentProject,
    role,
    organization,
  } = await resolveProjectContext(org, projectSlug)

  if (!role.authorize({ proposal: ['create'] }).success) {
    redirect(
      `/error?message=${encodeURIComponent('You do not have permission to create proposals')}`
    )
  }
  const settings = await projectsService.getSettings(
    organization.id,
    currentProject.id
  )

  return (
    <ProposalEditor
      defaultCurrency={settings.currency}
      isClientInvolved={settings.clientInvolvement.proposals === 'on'}
      mode='create'
      orgSlug={org}
      projectId={currentProject.id}
      projectName={currentProject.name}
      projectSlug={projectSlug}
    />
  )
}
