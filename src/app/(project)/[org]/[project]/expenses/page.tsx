import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { resolveProjectContext } from '@/app/(organization)/[org]/cache'
import { expensesServices } from '@/app/api/expenses/service'
import { teamService } from '@/app/api/teams/service'
import ExpensesClient from './page.client'

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

  const [expenses, categories, clients] = await Promise.all([
    expensesServices.listByProject(currentProject.id, h),
    expensesServices.listCategoriesByOrg(organization.id),
    isAdmin
      ? teamService.getProjectClients(currentProject.id)
      : Promise.resolve([]),
  ])

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
      expenses={expenses}
      isAdmin={isAdmin}
      isClient={isClient}
      organizationId={organization.id}
      orgSlug={org}
      projectId={currentProject.id}
      projectName={currentProject.name}
      projectSlug={projectSlug}
    />
  )
}
