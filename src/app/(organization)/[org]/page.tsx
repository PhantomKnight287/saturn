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
import {
  classifyInvoices,
  classifyMilestones,
  getGreeting,
  summarizeTime,
  toOverdueInvoiceEntries,
} from '@/lib/overview-stats'
import type { RouteImpl } from '@/types'
import { resolveOrgContext } from './cache'

export const metadata: Metadata = createMetadata({
  title: 'Overview',
  description: 'Your workspace at a glance — projects, invoices, and activity.',
  openGraph: { images: ['/api/og?page=Overview'] },
  twitter: { images: ['/api/og?page=Overview'] },
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

  const projectsById = new Map(projectList.map((p) => [p.id, p]))
  const invoiceBuckets = classifyInvoices(invoiceList)
  const milestoneBuckets = classifyMilestones(milestoneList)
  const time = summarizeTime(timeEntryList)
  const overdueInvoiceEntries = toOverdueInvoiceEntries(
    invoiceBuckets.overdue,
    projectsById
  )

  const { team: teamCount, client: clientCount } = memberCounts
  const projectsWithDueDate = projectList.filter((p) => p.dueDate).length

  const hasActionItems =
    overdueInvoiceEntries.length > 0 ||
    invoiceBuckets.disputed.length > 0 ||
    (canReadMilestones &&
      (milestoneBuckets.overdue.length > 0 ||
        milestoneBuckets.blocked.length > 0)) ||
    (isAdmin && invoiceBuckets.draft.length > 0)

  const userName = (session as { name?: string }).name?.split(' ')[0] ?? ''
  const greeting = getGreeting()

  return (
    <div className='w-full space-y-8'>
      <header className='flex flex-wrap items-start justify-between gap-4'>
        <div>
          <h1 className='font-semibold text-2xl tracking-tight'>
            {greeting}
            {userName && `, ${userName}`}
          </h1>
          <p className='mt-1 text-muted-foreground text-sm'>
            Here's what's happening in {organization.name}.
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
      </header>

      {!hasProjects && (
        <Card>
          <CardContent className='flex flex-col items-center gap-3 py-12 text-center'>
            <div className='flex size-12 items-center justify-center rounded-full bg-muted'>
              <Briefcase className='size-6 text-muted-foreground' />
            </div>
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
                Create a project →
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {hasActionItems && (
        <section className='space-y-3'>
          <SectionLabel>Needs your attention</SectionLabel>
          <NeedsAttentionCard>
            {overdueInvoiceEntries.length > 0 && (
              <OverdueInvoicesAccordion
                invoices={overdueInvoiceEntries}
                orgSlug={org}
                showProjectName
              />
            )}
            {invoiceBuckets.disputed.length > 0 && (
              <ActionItemLink
                count={invoiceBuckets.disputed.length}
                href={`/${org}/projects`}
                icon={FileSpreadsheet}
                label='Disputed invoices'
                variant='destructive'
              />
            )}
            {canReadMilestones && milestoneBuckets.overdue.length > 0 && (
              <ActionItemLink
                count={milestoneBuckets.overdue.length}
                href={`/${org}/projects`}
                icon={MilestoneIcon}
                label='Overdue milestones'
                variant='destructive'
              />
            )}
            {canReadMilestones && milestoneBuckets.blocked.length > 0 && (
              <ActionItemLink
                count={milestoneBuckets.blocked.length}
                href={`/${org}/projects`}
                icon={ClipboardList}
                label='Blocked milestones'
              />
            )}
            {isAdmin && invoiceBuckets.draft.length > 0 && (
              <ActionItemLink
                count={invoiceBuckets.draft.length}
                href={`/${org}/projects`}
                icon={FileText}
                label='Draft invoices'
              />
            )}
          </NeedsAttentionCard>
        </section>
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
        <section className='space-y-3'>
          <SectionLabel>At a glance</SectionLabel>
          <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
            <StatCard
              accent='violet'
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
                accent='sky'
                icon={Clock}
                label='Logged this month'
                sublabel={`${time.entryCount} ${time.entryCount === 1 ? 'entry' : 'entries'}`}
                value={`${time.hours}h ${time.minutes}m`}
              />
            )}
            {canReadMilestones && milestoneList.length > 0 && (
              <StatCard
                accent='amber'
                icon={MilestoneIcon}
                label='Milestones'
                sublabel={`${milestoneBuckets.completed}/${milestoneList.length} completed`}
                value={`${milestoneBuckets.completionPercent}%`}
              />
            )}
            {canReadInvoices && (
              <StatCard
                accent='teal'
                icon={FileSpreadsheet}
                label='Invoices'
                sublabel={
                  invoiceList.length > 0
                    ? `${invoiceBuckets.paid.length} paid · ${invoiceBuckets.sent.length} sent`
                    : undefined
                }
                value={invoiceList.length}
              />
            )}
          </div>
        </section>
      )}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className='font-medium text-muted-foreground text-sm uppercase tracking-wider'>
      {children}
    </h2>
  )
}
