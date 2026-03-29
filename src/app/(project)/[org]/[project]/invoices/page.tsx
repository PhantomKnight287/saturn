import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { resolveProjectContext } from '@/app/(organization)/[org]/cache'
import { invoicesService } from '@/app/api/invoices/service'
import type { Role } from '@/types'
import { InvoicesClient } from './page.client'

export default async function Invoices({
  params,
}: PageProps<'/[org]/[project]/invoices'>) {
  const { org, project: projectSlug } = await params
  const {
    project: currentProject,
    role,
    orgMember,
  } = await resolveProjectContext(org, projectSlug)

  if (!role.authorize({ invoice: ['read'] }).success) {
    redirect(
      `/error?message=${encodeURIComponent('You do not have permission to view invoices')}`
    )
  }

  const invoiceList = await invoicesService.listByProject(
    currentProject.id,
    await headers()
  )
  const canCreate = role.authorize({ invoice: ['create'] }).success

  return (
    <InvoicesClient
      canCreate={canCreate}
      invoices={invoiceList}
      orgSlug={org}
      projectSlug={projectSlug}
      role={orgMember.role as Role}
    />
  )
}
