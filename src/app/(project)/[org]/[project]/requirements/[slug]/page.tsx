import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { resolveProjectContext } from '@/app/(organization)/[org]/cache'
import { requirementsService } from '@/app/api/requirements/service'
import { signaturesService } from '@/app/api/signatures/service'
import { teamService } from '@/app/api/teams/service'
import { createMetadata } from '@/lib/metadata'
import type { Role } from '@/types'
import RequirementEditor from '../_components/requirement-editor'

export const metadata: Metadata = createMetadata({
  title: 'Requirement',
  description: 'Review and edit a project requirement.',
  openGraph: {
    images: ['/api/og?page=Requirements'],
  },
  twitter: {
    images: ['/api/og?page=Requirements'],
  },
})

export default async function RequirementDetail({
  params,
}: PageProps<'/[org]/[project]/requirements/[slug]'>) {
  const { org, project: projectSlug, slug } = await params
  const {
    project: currentProject,
    orgMember,
    role,
  } = await resolveProjectContext(org, projectSlug)

  if (!role.authorize({ requirement: ['read'] }).success) {
    redirect(
      `/error?message=${encodeURIComponent('You do not have permission to view requirements')}`
    )
  }

  const requirement = await requirementsService.getBySlug(
    currentProject.id,
    slug
  )

  if (!requirement) {
    redirect(`/error?message=${encodeURIComponent('Requirement not found')}`)
  }

  const canEdit =
    role.authorize({ requirement: ['update'] }).success &&
    requirement.status !== 'client_accepted'
  const canSendForSign = role.authorize({
    requirement: ['send_for_sign'],
  }).success

  const [
    threads,
    projectClients,
    recipients,
    signatures,
    changeRequests,
    signatureMedia,
  ] = await Promise.all([
    requirementsService.getThreads(currentProject.id, requirement.id),
    canSendForSign ? teamService.getProjectClients(currentProject.id) : [],
    requirementsService.getRecipients(requirement.id),
    requirementsService.getSignatures(requirement.id),
    requirementsService.getChangeRequests(requirement.id),
    signaturesService.getSignatureMediaForMember(
      currentProject.organizationId,
      orgMember.id
    ),
  ])

  const isRecipient = recipients.some((r) => r.clientMemberId === orgMember.id)
  const hasSigned = signatures.some((s) => s.clientMemberId === orgMember.id)

  return (
    <RequirementEditor
      canEdit={canEdit}
      canSendForSign={canSendForSign}
      canSign={isRecipient}
      changeRequests={changeRequests}
      hasSignedAlready={hasSigned}
      mode='edit'
      orgSlug={org}
      projectClients={projectClients}
      projectId={currentProject.id}
      projectName={currentProject.name}
      projectSlug={projectSlug}
      requirement={requirement}
      role={orgMember.role as Role}
      signatureMedia={signatureMedia}
      signatures={signatures}
      threads={threads}
    />
  )
}
