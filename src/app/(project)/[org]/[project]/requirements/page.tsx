import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { resolveProjectContext } from '@/app/(organization)/[org]/cache'
import { requirementsService } from '@/app/api/requirements/service'
import { createMetadata } from '@/lib/metadata'
import type { Role } from '@/types'
import { RequirementsClient } from './page.client'

export const metadata: Metadata = createMetadata({
  title: 'Requirements',
  description: 'Write, review, and sign off on project requirements.',
  openGraph: {
    images: ['/api/og?page=Requirements'],
  },
  twitter: {
    images: ['/api/og?page=Requirements'],
  },
})

export default async function Requirements({
  params,
}: PageProps<'/[org]/[project]/requirements'>) {
  const { org, project: projectSlug } = await params
  const {
    project: currentProject,
    role,
    orgMember,
  } = await resolveProjectContext(org, projectSlug)

  if (!role.authorize({ requirement: ['read'] }).success) {
    redirect(
      `/error?message=${encodeURIComponent('You do not have permission to view requirements')}`
    )
  }

  const requirementList = await requirementsService.listByProject(
    currentProject.id,
    await headers()
  )

  const canCreate = role.authorize({ requirement: ['create'] }).success

  return (
    <RequirementsClient
      canCreate={canCreate}
      orgSlug={org}
      projectSlug={projectSlug}
      requirements={requirementList}
      role={orgMember.role as Role}
    />
  )
}
