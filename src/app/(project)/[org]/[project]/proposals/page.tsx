import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { resolveProjectContext } from '@/app/(organization)/[org]/cache'
import { proposalsService } from '@/app/api/proposals/service'
import type { Role } from '@/types'
import { ProposalsClient } from './page.client'
import { createMetadata } from '@/lib/metadata'
import type { Metadata } from 'next'

export const metadata: Metadata = createMetadata({
  openGraph: {
    images: ['/api/og?page=Proposals'],
  },
  twitter: {
    images: ['/api/og?page=Proposals'],
  },
})

export default async function Proposals({
  params,
}: PageProps<'/[org]/[project]/proposals'>) {
  const { org, project: projectSlug } = await params
  const {
    project: currentProject,
    orgMember,
    role,
  } = await resolveProjectContext(org, projectSlug)

  if (!role.authorize({ proposal: ['read'] }).success) {
    redirect(
      `/error?message=${encodeURIComponent('You do not have permission to view proposals')}`
    )
  }

  const proposalList = await proposalsService.listByProject(
    currentProject.id,
    await headers()
  )

  const canCreate = role.authorize({ proposal: ['create'] }).success

  return (
    <ProposalsClient
      canCreate={canCreate}
      orgSlug={org}
      projectSlug={projectSlug}
      proposals={proposalList}
      role={orgMember.role as Role}
    />
  )
}
