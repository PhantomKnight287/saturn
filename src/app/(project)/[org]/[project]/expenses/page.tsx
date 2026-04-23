import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { resolveProjectContext } from '@/app/(organization)/[org]/cache'
import { expensesServices } from '@/app/api/expenses/service'
import { projectsService } from '@/app/api/projects/service'
import { teamService } from '@/app/api/teams/service'
import { createMetadata } from '@/lib/metadata'
import ExpensesClient from './page.client'

export const metadata: Metadata = createMetadata({
  title: 'Expenses',
  description: 'Track and approve project expenses.',
  openGraph: {
    images: ['/api/og?page=Expenses'],
  },
  twitter: {
    images: ['/api/og?page=Expenses'],
  },
})

export default async function Expenses({
  params,
}: PageProps<'/[org]/[project]/expenses'>) {
  const { org, project: projectSlug } = await params

  const {
    organization,
    project: currentProject,
    orgMember,
    role,
  } = await resolveProjectContext(org, projectSlug)

  if (!role.authorize({ expense: ['read'] }).success) {
    redirect(
      `/error?message=${encodeURIComponent('You do not have permission to view expenses')}`
    )
  }

  const h = await headers()
  const isAdmin = orgMember.role === 'owner' || orgMember.role === 'admin'
  const isClient = orgMember.role === 'client'

  const [allExpenses, categories, clients, settings] = await Promise.all([
    expensesServices.listByProject(currentProject.id, h),
    expensesServices.listCategoriesByOrg(organization.id),
    isAdmin
      ? teamService.getProjectClients(currentProject.id)
      : Promise.resolve([]),
    projectsService.getSettings(organization.id, currentProject.id),
  ])

  const clientFacingExpenseIds = allExpenses
    .filter(
      (e) =>
        e.status === 'submitted_to_client' ||
        e.status === 'client_accepted' ||
        e.status === 'client_rejected'
    )
    .map((e) => e.id)

  const recipients = await expensesServices.getRecipientsByExpenseIds(
    clientFacingExpenseIds
  )

  const canCreate = role.authorize({ expense: ['create'] }).success
  const canApprove = role.authorize({ expense: ['approve'] }).success
  const canSubmit = role.authorize({ expense: ['submit'] }).success

  return (
    <ExpensesClient
      allCategories={categories}
      canApprove={canApprove}
      canCreate={canCreate}
      canSubmit={canSubmit}
      categories={categories.filter((c) => !c.isArchived)}
      clients={clients}
      currentMemberId={orgMember.id}
      defaultCurrency={settings.currency}
      expenses={allExpenses}
      isAdmin={isAdmin}
      isClient={isClient}
      isClientInvolved={settings.clientInvolvement.expenses === 'on'}
      organizationId={organization.id}
      orgSlug={org}
      projectId={currentProject.id}
      projectName={currentProject.name}
      projectSlug={projectSlug}
      recipients={recipients}
    />
  )
}
