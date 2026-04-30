import { format } from 'date-fns'
import {
  AlertTriangleIcon,
  ClipboardList,
  Clock,
  FileSpreadsheet,
  FileText,
  Milestone as MilestoneIcon,
  Receipt,
  ShieldAlert,
  Users,
} from 'lucide-react'
import type { Metadata } from 'next'
import { headers } from 'next/headers'

import {
  requirePermission,
  resolveProjectContext,
} from '@/app/(organization)/[org]/cache'
import { expensesServices } from '@/app/api/expenses/service'
import { invoicesService } from '@/app/api/invoices/service'
import { milestonesService } from '@/app/api/milestones/service'
import { proposalsService } from '@/app/api/proposals/service'
import { requirementsService } from '@/app/api/requirements/service'
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
import { createMetadata } from '@/lib/metadata'
import {
  classifyExpenses,
  classifyInvoices,
  classifyMilestones,
  summarizeTimeEntries,
  toOverdueInvoiceEntries,
} from '@/lib/overview-stats'
import { ActiveMilestonesCard } from './_components/active-milestones-card'
import { BudgetCard } from './_components/budget-card'
import {
  ProposalsPendingCard,
  RequirementsAwaitingSignatureCard,
} from './_components/pending-signatures-cards'
import { ProjectHeaderStatus } from './_components/project-header-status'
import { TimesheetReportsCard } from './_components/timesheet-reports-card'

export const metadata: Metadata = createMetadata({
  title: 'Project Overview',
  description: 'Project at a glance — milestones, budget, and pending work.',
  openGraph: { images: ['/api/og?page=Overview'] },
  twitter: { images: ['/api/og?page=Overview'] },
})

export default async function ProjectOverview({
  params,
}: PageProps<'/[org]/[project]'>) {
  const { org, project: projectSlug } = await params
  const { organization, project, orgMember, role } =
    await resolveProjectContext(org, projectSlug)

  requirePermission(
    role,
    { project: ['read'] },
    'You do not have permission to view this project'
  )

  const h = await headers()
  const isClient = orgMember.role === 'client'
  const isAdmin = orgMember.role === 'owner' || orgMember.role === 'admin'

  const canReadMilestones = role.authorize({ milestone: ['read'] }).success
  const canReadRequirements = role.authorize({ requirement: ['read'] }).success
  const canReadTimesheets = role.authorize({ time_entry: ['read'] }).success
  const canReadExpenses = role.authorize({ expense: ['read'] }).success
  const canReadInvoices = role.authorize({ invoice: ['read'] }).success
  const canReadProposals = role.authorize({ proposal: ['read'] }).success
  const canReadReports = role.authorize({ timesheet_report: ['read'] }).success

  const [
    milestones,
    requirements,
    timeEntries,
    budgetStatus,
    expenses,
    invoices,
    proposals,
    timesheetReports,
    members,
    clients,
  ] = await Promise.all([
    canReadMilestones
      ? milestonesService.listByProjectWithProgress(project.id)
      : Promise.resolve([]),
    canReadRequirements
      ? requirementsService.listByProject(project.id, h)
      : Promise.resolve([]),
    canReadTimesheets
      ? timesheetService.listByProject(project.id, h)
      : Promise.resolve([]),
    isAdmin
      ? timesheetService.getProjectBudgetStatus(project.id)
      : Promise.resolve(null),
    canReadExpenses
      ? expensesServices.listByProject(project.id, h)
      : Promise.resolve([]),
    canReadInvoices
      ? invoicesService.listByProject(project.id, h)
      : Promise.resolve([]),
    canReadProposals
      ? proposalsService.listByProject(project.id, h)
      : Promise.resolve([]),
    canReadReports
      ? timesheetService.listReportsByProject(project.id)
      : Promise.resolve([]),
    teamService.getProjectMembers(project.id),
    teamService.getProjectClients(project.id),
  ])

  const basePath = `/${org}/${projectSlug}`

  const ms = classifyMilestones(milestones)
  const time = summarizeTimeEntries(timeEntries)
  const inv = classifyInvoices(invoices)
  const exp = classifyExpenses(expenses)
  const requirementsAwaitingSignature = requirements.filter(
    (r) => r.status === 'submitted_to_client'
  )
  const requirementsWithChanges = requirements.filter(
    (r) => r.status === 'changes_requested'
  )
  const proposalsAwaitingSignature = proposals.filter(
    (p) => p.status === 'submitted_to_client'
  )
  const reportsDisputed = timesheetReports.filter(
    (r) => r.status === 'disputed'
  )
  const reportsPending = timesheetReports.filter((r) => r.status === 'sent')
  const overdueInvoiceEntries = toOverdueInvoiceEntries(
    inv.overdue,
    projectSlug
  )

  const hasActionItems =
    overdueInvoiceEntries.length > 0 ||
    (isAdmin &&
      (time.pendingApproval.length > 0 ||
        exp.pendingAdmin.length > 0 ||
        inv.disputed.length > 0 ||
        reportsDisputed.length > 0 ||
        requirementsWithChanges.length > 0)) ||
    (isClient &&
      (requirementsAwaitingSignature.length > 0 ||
        proposalsAwaitingSignature.length > 0 ||
        reportsPending.length > 0 ||
        exp.pendingClient.length > 0)) ||
    (!(isClient || isAdmin) && time.rejected.length > 0) ||
    (canReadMilestones && (ms.blocked.length > 0 || ms.overdue.length > 0))

  const hasDetailGridContent =
    (canReadMilestones && ms.inProgress.length > 0) ||
    (canReadRequirements && requirementsAwaitingSignature.length > 0) ||
    (canReadProposals && proposalsAwaitingSignature.length > 0) ||
    (isAdmin && !!budgetStatus) ||
    (canReadReports && timesheetReports.length > 0)

  return (
    <div className='w-full space-y-8'>
      <header className='flex flex-wrap items-start justify-between gap-4'>
        <div>
          <h1 className='font-semibold text-2xl tracking-tight'>
            {project.name}
          </h1>
          {project.description && (
            <p className='mt-1 max-w-prose text-muted-foreground text-sm'>
              {project.description}
            </p>
          )}
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <ProjectHeaderStatus
            canEdit={isAdmin}
            dueDate={project.dueDate ? new Date(project.dueDate) : null}
            organizationId={organization.id}
            projectId={project.id}
            status={project.status ?? 'planning'}
          />
          <Badge className='rounded-md' variant='outline'>
            <Users className='size-3' />
            {members.length} {members.length === 1 ? 'member' : 'members'}
            {clients.length > 0 &&
              ` · ${clients.length} ${clients.length === 1 ? 'client' : 'clients'}`}
          </Badge>
        </div>
      </header>

      {hasActionItems && (
        <section className='space-y-3'>
          <SectionLabel>Needs your attention</SectionLabel>
          <NeedsAttentionCard>
            {overdueInvoiceEntries.length > 0 && (
              <OverdueInvoicesAccordion
                invoices={overdueInvoiceEntries}
                orgSlug={org}
              />
            )}
            {isAdmin && time.pendingApproval.length > 0 && (
              <ActionItemLink
                count={time.pendingApproval.length}
                href={`${basePath}/timesheets`}
                icon={Clock}
                label='Timesheets pending approval'
              />
            )}
            {isAdmin && exp.pendingAdmin.length > 0 && (
              <ActionItemLink
                count={exp.pendingAdmin.length}
                href={`${basePath}/expenses`}
                icon={Receipt}
                label='Expenses pending approval'
              />
            )}
            {isAdmin && inv.disputed.length > 0 && (
              <ActionItemLink
                count={inv.disputed.length}
                href={`${basePath}/invoices`}
                icon={FileSpreadsheet}
                label='Disputed invoices'
                variant='destructive'
              />
            )}
            {isAdmin && reportsDisputed.length > 0 && (
              <ActionItemLink
                count={reportsDisputed.length}
                href={`${basePath}/timesheets`}
                icon={ShieldAlert}
                label='Disputed timesheet reports'
                variant='destructive'
              />
            )}
            {isAdmin && requirementsWithChanges.length > 0 && (
              <ActionItemLink
                count={requirementsWithChanges.length}
                href={`${basePath}/requirements`}
                icon={ClipboardList}
                label='Requirements with change requests'
              />
            )}
            {isClient && requirementsAwaitingSignature.length > 0 && (
              <ActionItemLink
                count={requirementsAwaitingSignature.length}
                href={`${basePath}/requirements`}
                icon={ClipboardList}
                label='Requirements awaiting your signature'
              />
            )}
            {isClient && proposalsAwaitingSignature.length > 0 && (
              <ActionItemLink
                count={proposalsAwaitingSignature.length}
                href={`${basePath}/proposals`}
                icon={FileText}
                label='Proposals awaiting your signature'
              />
            )}
            {isClient && reportsPending.length > 0 && (
              <ActionItemLink
                count={reportsPending.length}
                href={`${basePath}/timesheets`}
                icon={Clock}
                label='Timesheet reports to review'
              />
            )}
            {isClient && exp.pendingClient.length > 0 && (
              <ActionItemLink
                count={exp.pendingClient.length}
                href={`${basePath}/expenses`}
                icon={Receipt}
                label='Expenses to review'
              />
            )}
            {!(isClient || isAdmin) && time.rejected.length > 0 && (
              <ActionItemLink
                count={time.rejected.length}
                href={`${basePath}/timesheets`}
                icon={Clock}
                label='Rejected timesheets to fix'
                variant='destructive'
              />
            )}
            {canReadMilestones && ms.blocked.length > 0 && (
              <ActionItemLink
                count={ms.blocked.length}
                href={`${basePath}/milestones`}
                icon={ShieldAlert}
                label='Blocked milestones'
                variant='destructive'
              />
            )}
            {canReadMilestones && ms.overdue.length > 0 && (
              <ActionItemLink
                count={ms.overdue.length}
                href={`${basePath}/milestones`}
                icon={AlertTriangleIcon}
                label='Overdue milestones'
                variant='destructive'
              />
            )}
          </NeedsAttentionCard>
        </section>
      )}

      {canReadInvoices && orgMember.role !== 'client' && (
        <FinancialOverviewCard
          expenses={canReadExpenses ? expenses : []}
          invoices={invoices}
          isAdmin={isAdmin}
          isClient={isClient}
          viewAllHref={`${basePath}/invoices`}
        />
      )}

      <section className='space-y-3'>
        <SectionLabel>At a glance</SectionLabel>
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
          {canReadMilestones && (
            <StatCard
              accent='amber'
              href={`${basePath}/milestones`}
              icon={MilestoneIcon}
              label='Milestones'
              sublabel={
                milestones.length > 0
                  ? `${ms.completed}/${milestones.length} done${ms.next?.dueDate ? ` · next ${format(new Date(ms.next.dueDate), 'MMM d')}` : ''}`
                  : undefined
              }
              value={
                milestones.length > 0
                  ? `${ms.completionPercent}%`
                  : milestones.length
              }
            />
          )}
          {canReadTimesheets && (
            <StatCard
              accent='sky'
              href={`${basePath}/timesheets`}
              icon={Clock}
              label='Time Logged'
              sublabel={
                budgetStatus
                  ? `${budgetStatus.percentageUsed}% of budget used`
                  : undefined
              }
              value={`${time.hours}h ${time.minutes}m`}
            />
          )}
          {canReadInvoices && (
            <StatCard
              accent='teal'
              href={`${basePath}/invoices`}
              icon={FileSpreadsheet}
              label='Invoices'
              sublabel={
                invoices.length > 0
                  ? `${inv.paid.length} paid · ${inv.sent.length} sent · ${inv.draft.length} draft`
                  : undefined
              }
              value={invoices.length}
            />
          )}
          {canReadExpenses && (
            <StatCard
              accent='rose'
              href={`${basePath}/expenses`}
              icon={Receipt}
              label='Expenses'
              sublabel={
                expenses.length > 0
                  ? `${exp.billableApproved.length} billable · ${exp.pendingAdmin.length + exp.pendingClient.length} pending`
                  : undefined
              }
              value={expenses.length}
            />
          )}
        </div>
      </section>

      {hasDetailGridContent && (
        <section className='space-y-3'>
          <SectionLabel>Active work</SectionLabel>
          <div className='grid gap-4 lg:grid-cols-2'>
            {canReadMilestones && ms.inProgress.length > 0 && (
              <ActiveMilestonesCard
                basePath={basePath}
                milestones={ms.inProgress}
              />
            )}
            {canReadRequirements &&
              requirementsAwaitingSignature.length > 0 && (
                <RequirementsAwaitingSignatureCard
                  basePath={basePath}
                  requirements={requirementsAwaitingSignature}
                />
              )}
            {canReadProposals && proposalsAwaitingSignature.length > 0 && (
              <ProposalsPendingCard
                basePath={basePath}
                proposals={proposalsAwaitingSignature}
              />
            )}
            {isAdmin && budgetStatus && <BudgetCard budget={budgetStatus} />}
            {canReadReports && timesheetReports.length > 0 && (
              <TimesheetReportsCard
                basePath={basePath}
                reports={timesheetReports}
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
