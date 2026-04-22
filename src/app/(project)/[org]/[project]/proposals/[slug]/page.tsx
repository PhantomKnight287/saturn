import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { resolveProjectContext } from '@/app/(organization)/[org]/cache'
import { projectsService } from '@/app/api/projects/service'
import { proposalsService } from '@/app/api/proposals/service'
import { signaturesService } from '@/app/api/signatures/service'
import { teamService } from '@/app/api/teams/service'
import { threadService } from '@/app/api/threads/service'
import { createMetadata } from '@/lib/metadata'
import type { Role } from '@/types'
import ProposalEditor from '../_components/proposal-editor'

export const metadata: Metadata = createMetadata({
  title: 'Proposal',
  description: 'Review, edit, and track proposal status.',
  openGraph: {
    images: ['/api/og?page=Proposals'],
  },
  twitter: {
    images: ['/api/og?page=Proposals'],
  },
})

export default async function ProposalDetail({
  params,
}: PageProps<'/[org]/[project]/proposals/[slug]'>) {
  const { org, project: projectSlug, slug } = await params
  const {
    project: currentProject,
    orgMember,
    role,
    organization,
  } = await resolveProjectContext(org, projectSlug)

  if (!role.authorize({ proposal: ['read'] }).success) {
    redirect(
      `/error?message=${encodeURIComponent('You do not have permission to view proposals')}`
    )
  }

  const proposal = await proposalsService.getBySlug(currentProject.id, slug)

  if (!proposal) {
    redirect(`/error?message=${encodeURIComponent('Proposal not found')}`)
  }

  const canEdit =
    role.authorize({ proposal: ['update'] }).success &&
    proposal.status !== 'client_accepted' &&
    proposal.status !== 'client_rejected'
  const canSend = role.authorize({ proposal: ['send'] }).success

  const [
    threads,
    projectClients,
    recipients,
    signatures,
    lineItems,
    signatureMedia,
    settings,
  ] = await Promise.all([
    threadService.getThreads(currentProject.id, proposal.id),
    canSend ? teamService.getProjectClients(currentProject.id) : [],
    proposalsService.getRecipients(proposal.id),
    proposalsService.getSignatures(proposal.id),
    proposalsService.getDeliverables(proposal.id),
    signaturesService.getSignatureMediaForMember(
      currentProject.organizationId,
      orgMember.id
    ),
    projectsService.getSettings(organization.id, currentProject.id),
  ])

  const isRecipient = recipients.some((r) => r.clientMemberId === orgMember.id)
  const hasSigned = signatures.some((s) => s.clientMemberId === orgMember.id)

  return (
    <ProposalEditor
      canEdit={canEdit}
      canSend={canSend}
      canSign={isRecipient}
      hasSignedAlready={hasSigned}
      initialDeliverables={lineItems}
      //   initialExpenseItems={expenseItems.map((item) => ({
      //     description: item.description,
      //     amount: item.amount,
      //     category: item.category ?? '',
      //     billable: item.billable,
      //   }))}
      isClientInvolved={settings.clientInvolvement.proposals === 'on'}
      mode='edit'
      orgSlug={org}
      projectClients={projectClients}
      projectId={currentProject.id}
      projectName={currentProject.name}
      projectSlug={projectSlug}
      proposal={proposal}
      role={orgMember.role as Role}
      signatureMedia={signatureMedia}
      signatures={signatures}
      threads={threads}
    />
  )
}
