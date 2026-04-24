import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { resolveProjectContext } from '@/app/(organization)/[org]/cache'
import { invoicesService } from '@/app/api/invoices/service'
import { projectsService } from '@/app/api/projects/service'
import { createMetadata } from '@/lib/metadata'
import type { Role } from '@/types'
import { InvoicesClient } from './page.client'

export const metadata: Metadata = createMetadata({
  title: 'Invoices',
  description: 'Create, send, and track invoices for the project.',
  openGraph: {
    images: ['/api/og?page=Invoices'],
  },
  twitter: {
    images: ['/api/og?page=Invoices'],
  },
})

export default async function Invoices({
  params,
}: PageProps<'/[org]/[project]/invoices'>) {
  const { org, project: projectSlug } = await params
  const {
    project: currentProject,
    role,
    orgMember,
    organization,
  } = await resolveProjectContext(org, projectSlug)

  if (!role.authorize({ invoice: ['read'] }).success) {
    redirect(
      `/error/403?message=${encodeURIComponent('You do not have permission to view invoices')}`
    )
  }

  const invoiceList = await invoicesService.listByProject(
    currentProject.id,
    await headers()
  )
  const canCreate = role.authorize({ invoice: ['create'] }).success
  const settings = await projectsService.getSettings(
    organization.id,
    currentProject.id
  )

  return (
    <InvoicesClient
      canCreate={canCreate}
      invoices={invoiceList}
      isClientInvolved={settings.clientInvolvement.invoices === 'on'}
      orgSlug={org}
      projectSlug={projectSlug}
      role={orgMember.role as Role}
    />
  )
}
