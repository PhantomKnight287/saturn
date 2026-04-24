import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { resolveProjectContext } from '@/app/(organization)/[org]/cache'
import { createMetadata } from '@/lib/metadata'
import type { Role } from '@/types'
import RequirementEditor from '../_components/requirement-editor'

export const metadata: Metadata = createMetadata({
  title: 'New Requirement',
  description: 'Write a new project requirement for review and sign-off.',
  openGraph: {
    images: ['/api/og?page=Requirements'],
  },
  twitter: {
    images: ['/api/og?page=Requirements'],
  },
})

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
      `/error/403?message=${encodeURIComponent('You do not have permission to create requirements')}`
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
