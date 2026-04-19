import { startOfMonth } from 'date-fns'
import {
  Briefcase,
  ClipboardList,
  Clock,
  FileSpreadsheet,
  FileText,
  Milestone as MilestoneIcon,
  Users,
} from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { expensesServices } from '@/app/api/expenses/service'
import { invoicesService } from '@/app/api/invoices/service'
import { milestonesService } from '@/app/api/milestones/service'
import { projectsService } from '@/app/api/projects/service'
import { teamService } from '@/app/api/teams/service'
import { timesheetService } from '@/app/api/timesheets/service'
import { FinancialOverviewCard } from '@/components/dashboard/financial-overview-card'
import {
  ActionItemLink,
  NeedsAttentionCard,
} from '@/components/dashboard/needs-attention'
import { OverdueInvoicesAccordion } from '@/components/dashboard/overdue-invoices-accordion'
import { StatCard } from '@/components/dashboard/stat-card'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { createMetadata } from '@/lib/metadata'
import type { RouteImpl } from '@/types'
import { resolveOrgContext } from './cache'

export const metadata: Metadata = createMetadata({
  title: 'Overview',
  description: 'Your workspace at a glance — projects, invoices, and activity.',
  openGraph: {
    images: ['/api/og?page=Overview'],
  },
  twitter: {
    images: ['/api/og?page=Overview'],
  },
})

export default async function OrganizationPage(props: PageProps<'/[org]'>) {
  const { org } = await props.params
  const { session, organization, orgMember, role } =
    await resolveOrgContext(org)

  if (!session) {
    redirect(`/auth/sign-in?callback=${encodeURIComponent(`/${org}`)}`)
  }
  if (!organization) {
    return notFound()
  }

  const isClient = orgMember.role === 'client'
  const isAdmin = orgMember.role === 'owner' || orgMember.role === 'admin'

  const canReadInvoices = role.authorize({ invoice: ['read'] }).success
  const canReadExpenses = role.authorize({ expense: ['read'] }).success
  const canReadMilestones = role.authorize({ milestone: ['read'] }).success
  const canReadTimesheets = role.authorize({ time_entry: ['read'] }).success

  const projectList = await projectsService.listAccessible(
    organization.id,
    orgMember
  )
  const projectIds = projectList.map((p) => p.id)
  const hasProjects = projectIds.length > 0

  const monthStart = startOfMonth(new Date())

  const [invoiceList, expenseList, timeEntryList, milestoneList, memberCounts] =
    await Promise.all([
      hasProjects && canReadInvoices
        ? invoicesService.listByProjectIds(projectIds, { clientView: isClient })
        : Promise.resolve([]),
      hasProjects && canReadExpenses
        ? expensesServices.listByProjectIds(projectIds)
        : Promise.resolve([]),
      hasProjects && canReadTimesheets
        ? timesheetService.listByProjectIdsSince(
            projectIds,
            monthStart,
            orgMember.role === 'member' ? orgMember.id : undefined
          )
        : Promise.resolve([]),
      hasProjects && canReadMilestones
        ? milestonesService.listByProjectIds(projectIds)
        : Promise.resolve([]),
      isAdmin
        ? teamService.getOrgMemberCounts(organization.id)
        : Promise.resolve({ team: 0, client: 0 }),
    ])

  const projectBySlug = new Map(projectList.map((p) => [p.id, p]))

  const invoicesOverdue = invoiceList.filter(
    (i) => i.status === 'sent' && i.dueDate && new Date(i.dueDate) < new Date()
  )
  const invoicesDraft = invoiceList.filter((i) => i.status === 'draft')
  const invoicesDisputed = invoiceList.filter((i) => i.status === 'disputed')
  const invoicesPaid = invoiceList.filter((i) => i.status === 'paid')
  const invoicesSent = invoiceList.filter((i) => i.status === 'sent')

  const overdueInvoiceEntries = invoicesOverdue
    .map((inv) => {
      const project = projectBySlug.get(inv.projectId)
      if (!project) {
        return null
      }
      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        totalAmount: inv.totalAmount,
        currency: inv.currency,
        dueDate: new Date(inv.dueDate!),
        projectSlug: project.slug,
        projectName: project.name,
      }
    })
    .filter((e): e is NonNullable<typeof e> => e !== null)

  const minutesThisMonth = timeEntryList.reduce(
    (sum, e) => sum + e.durationMinutes,
    0
  )
  const hoursThisMonth = Math.floor(minutesThisMonth / 60)
  const minutesRemainder = minutesThisMonth % 60

  const milestonesOverdue = milestoneList.filter(
    (m) =>
      m.dueDate && new Date(m.dueDate) < new Date() && m.status !== 'completed'
  )
  const milestonesBlocked = milestoneList.filter((m) => m.status === 'blocked')
  const milestonesCompleted = milestoneList.filter(
    (m) => m.status === 'completed'
  ).length
  const milestoneProgress = milestoneList.length
    ? Math.round((milestonesCompleted / milestoneList.length) * 100)
    : 0

  const { team: teamCount, client: clientCount } = memberCounts

  const projectsWithDueDate = projectList.filter((p) => p.dueDate).length

  const hasActionItems =
    overdueInvoiceEntries.length > 0 ||
    invoicesDisputed.length > 0 ||
    (canReadMilestones &&
      (milestonesOverdue.length > 0 || milestonesBlocked.length > 0)) ||
    (isAdmin && invoicesDraft.length > 0)

  const userName = (session as { name?: string }).name?.split(' ')[0] ?? ''
  const greeting = getGreeting()

  return (
    <div className='w-full space-y-6'>
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div>
          <h1 className='font-semibold text-2xl'>
            {greeting}
            {userName && `, ${userName}`}
          </h1>
          <p className='mt-1 text-muted-foreground text-sm'>
            Here's what's happening in {organization.name}
          </p>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <Badge className='rounded-md' variant='outline'>
            <Briefcase className='size-3' />
            {projectList.length}{' '}
            {projectList.length === 1 ? 'project' : 'projects'}
          </Badge>
          {isAdmin && (
            <Badge className='rounded-md' variant='outline'>
              <Users className='size-3' />
              {teamCount} {teamCount === 1 ? 'member' : 'members'}
              {clientCount > 0 &&
                ` · ${clientCount} ${clientCount === 1 ? 'client' : 'clients'}`}
            </Badge>
          )}
        </div>
      </div>

      {!hasProjects && (
        <Card>
          <CardContent className='flex flex-col items-center gap-3 py-10 text-center'>
            <Briefcase className='size-8 text-muted-foreground' />
            <p className='text-muted-foreground text-sm'>
              No projects yet.{' '}
              {isAdmin
                ? 'Create one to start tracking work and billing clients.'
                : 'Ask an admin to add you to a project.'}
            </p>
            {isAdmin && (
              <Link
                className='text-primary text-sm underline-offset-4 hover:underline'
                href={`/${org}/projects?newProject=1` as RouteImpl}
              >
                Create a project
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {hasProjects && canReadInvoices && orgMember.role !== 'client' && (
        <FinancialOverviewCard
          expenses={canReadExpenses ? expenseList : []}
          invoices={invoiceList}
          isAdmin={isAdmin}
          isClient={isClient}
          scopeLabel={`Across ${projectList.length} ${projectList.length === 1 ? 'project' : 'projects'}`}
        />
      )}

      {hasProjects && (
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
          <StatCard
            href={`/${org}/projects`}
            icon={Briefcase}
            label='Projects'
            sublabel={
              projectList.length > 0
                ? `${projectsWithDueDate} with due date`
                : undefined
            }
            value={projectList.length}
          />
          {canReadTimesheets && (
            <StatCard
              icon={Clock}
              label='Logged this month'
              sublabel={`${timeEntryList.length} ${timeEntryList.length === 1 ? 'entry' : 'entries'}`}
              value={`${hoursThisMonth}h ${minutesRemainder}m`}
            />
          )}
          {canReadMilestones && milestoneList.length > 0 && (
            <StatCard
              icon={MilestoneIcon}
              label='Milestones'
              sublabel={`${milestonesCompleted}/${milestoneList.length} completed`}
              value={`${milestoneProgress}%`}
            />
          )}
          {canReadInvoices && (
            <StatCard
              icon={FileSpreadsheet}
              label='Invoices'
              sublabel={
                invoiceList.length > 0
                  ? `${invoicesPaid.length} paid · ${invoicesSent.length} sent`
                  : undefined
              }
              value={invoiceList.length}
            />
          )}
        </div>
      )}

      {hasActionItems && (
        <NeedsAttentionCard>
          {overdueInvoiceEntries.length > 0 && (
            <OverdueInvoicesAccordion
              invoices={overdueInvoiceEntries}
              orgSlug={org}
              showProjectName
            />
          )}
          {invoicesDisputed.length > 0 && (
            <ActionItemLink
              count={invoicesDisputed.length}
              href={`/${org}/projects`}
              icon={FileSpreadsheet}
              label='Disputed invoices'
              variant='destructive'
            />
          )}
          {canReadMilestones && milestonesOverdue.length > 0 && (
            <ActionItemLink
              count={milestonesOverdue.length}
              href={`/${org}/projects`}
              icon={MilestoneIcon}
              label='Overdue milestones'
              variant='destructive'
            />
          )}
          {canReadMilestones && milestonesBlocked.length > 0 && (
            <ActionItemLink
              count={milestonesBlocked.length}
              href={`/${org}/projects`}
              icon={ClipboardList}
              label='Blocked milestones'
            />
          )}
          {isAdmin && invoicesDraft.length > 0 && (
            <ActionItemLink
              count={invoicesDraft.length}
              href={`/${org}/projects`}
              icon={FileText}
              label='Draft invoices'
            />
          )}
        </NeedsAttentionCard>
      )}
    </div>
  )
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) {
    return 'Good morning'
  }
  if (hour < 18) {
    return 'Good afternoon'
  }
  return 'Good evening'
}
