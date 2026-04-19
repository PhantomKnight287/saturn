import { format, isPast } from 'date-fns'
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
import { redirect } from 'next/navigation'

import { resolveProjectContext } from '@/app/(organization)/[org]/cache'
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
  openGraph: {
    images: ['/api/og?page=Overview'],
  },
  twitter: {
    images: ['/api/og?page=Overview'],
  },
})

export default async function ProjectOverview({
  params,
}: PageProps<'/[org]/[project]'>) {
  const { org, project: projectSlug } = await params
  const { organization, project, orgMember, role } =
    await resolveProjectContext(org, projectSlug)

  if (!role.authorize({ project: ['read'] }).success) {
    redirect(
      `/error?message=${encodeURIComponent('You do not have permission to view this project')}`
    )
  }

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

  const milestonesBlocked = milestones.filter((m) => m.status === 'blocked')
  const milestonesOverdue = milestones.filter(
    (m) => m.dueDate && isPast(new Date(m.dueDate)) && m.status !== 'completed'
  )
  const milestonesInProgress = milestones.filter(
    (m) => m.status === 'in_progress'
  )
  const milestonesCompleted = milestones.filter(
    (m) => m.status === 'completed'
  ).length
  const milestoneCompletion = milestones.length
    ? Math.round((milestonesCompleted / milestones.length) * 100)
    : 0
  const nextMilestone = milestones
    .filter((m) => m.status !== 'completed' && m.dueDate)
    .sort(
      (a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime()
    )[0]

  const totalMinutesLogged = timeEntries.reduce(
    (sum, e) => sum + e.durationMinutes,
    0
  )
  const hoursLogged = Math.floor(totalMinutesLogged / 60)
  const minutesLogged = totalMinutesLogged % 60
  const timesheetsPendingApproval = timeEntries.filter(
    (e) => e.status === 'submitted_to_admin'
  )
  const timesheetsRejected = timeEntries.filter(
    (e) => e.status === 'admin_rejected'
  )

  const invoicesDisputed = invoices.filter((i) => i.status === 'disputed')
  const invoicesOverdue = invoices.filter(
    (i) => i.status === 'sent' && i.dueDate && isPast(new Date(i.dueDate))
  )
  const invoicesPending = invoices.filter((i) => i.status === 'sent')
  const invoicesPaid = invoices.filter((i) => i.status === 'paid')
  const invoicesDraft = invoices.filter((i) => i.status === 'draft')

  const expensesPendingAdminApproval = expenses.filter(
    (e) => e.status === 'submitted_to_admin'
  )
  const expensesPendingClientApproval = expenses.filter(
    (e) => e.status === 'submitted_to_client'
  )
  const billableApprovedExpenses = expenses.filter(
    (e) => e.billable && e.status === 'client_accepted'
  )

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
  const reportsPendingApproval = timesheetReports.filter(
    (r) => r.status === 'sent'
  )

  const overdueInvoiceEntries = invoicesOverdue.map((inv) => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    totalAmount: inv.totalAmount,
    currency: inv.currency,
    dueDate: new Date(inv.dueDate!),
    projectSlug,
  }))

  const hasActionItems =
    overdueInvoiceEntries.length > 0 ||
    (isAdmin &&
      (timesheetsPendingApproval.length > 0 ||
        expensesPendingAdminApproval.length > 0 ||
        invoicesDisputed.length > 0 ||
        reportsDisputed.length > 0 ||
        requirementsWithChanges.length > 0)) ||
    (isClient &&
      (requirementsAwaitingSignature.length > 0 ||
        proposalsAwaitingSignature.length > 0 ||
        reportsPendingApproval.length > 0 ||
        expensesPendingClientApproval.length > 0)) ||
    (!(isClient || isAdmin) && timesheetsRejected.length > 0) ||
    (canReadMilestones &&
      (milestonesBlocked.length > 0 || milestonesOverdue.length > 0))

  const hasDetailGridContent =
    (canReadMilestones && milestonesInProgress.length > 0) ||
    (canReadRequirements && requirementsAwaitingSignature.length > 0) ||
    (canReadProposals && proposalsAwaitingSignature.length > 0) ||
    (isAdmin && !!budgetStatus) ||
    (canReadReports && timesheetReports.length > 0)

  return (
    <div className='w-full space-y-6'>
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div>
          <h1 className='font-semibold text-2xl'>{project.name}</h1>
          {project.description && (
            <p className='mt-1 text-muted-foreground text-sm'>
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
      </div>

      {canReadInvoices && orgMember.role !== 'client' && (
        <FinancialOverviewCard
          expenses={canReadExpenses ? expenses : []}
          invoices={invoices}
          isAdmin={isAdmin}
          isClient={isClient}
          viewAllHref={`${basePath}/invoices`}
        />
      )}

      {hasActionItems && (
        <NeedsAttentionCard>
          {overdueInvoiceEntries.length > 0 && (
            <OverdueInvoicesAccordion
              invoices={overdueInvoiceEntries}
              orgSlug={org}
            />
          )}
          {isAdmin && timesheetsPendingApproval.length > 0 && (
            <ActionItemLink
              count={timesheetsPendingApproval.length}
              href={`${basePath}/timesheets`}
              icon={Clock}
              label='Timesheets pending approval'
            />
          )}
          {isAdmin && expensesPendingAdminApproval.length > 0 && (
            <ActionItemLink
              count={expensesPendingAdminApproval.length}
              href={`${basePath}/expenses`}
              icon={Receipt}
              label='Expenses pending approval'
            />
          )}
          {isAdmin && invoicesDisputed.length > 0 && (
            <ActionItemLink
              count={invoicesDisputed.length}
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
          {isClient && reportsPendingApproval.length > 0 && (
            <ActionItemLink
              count={reportsPendingApproval.length}
              href={`${basePath}/timesheets`}
              icon={Clock}
              label='Timesheet reports to review'
            />
          )}
          {isClient && expensesPendingClientApproval.length > 0 && (
            <ActionItemLink
              count={expensesPendingClientApproval.length}
              href={`${basePath}/expenses`}
              icon={Receipt}
              label='Expenses to review'
            />
          )}
          {!(isClient || isAdmin) && timesheetsRejected.length > 0 && (
            <ActionItemLink
              count={timesheetsRejected.length}
              href={`${basePath}/timesheets`}
              icon={Clock}
              label='Rejected timesheets to fix'
              variant='destructive'
            />
          )}
          {canReadMilestones && milestonesBlocked.length > 0 && (
            <ActionItemLink
              count={milestonesBlocked.length}
              href={`${basePath}/milestones`}
              icon={ShieldAlert}
              label='Blocked milestones'
              variant='destructive'
            />
          )}
          {canReadMilestones && milestonesOverdue.length > 0 && (
            <ActionItemLink
              count={milestonesOverdue.length}
              href={`${basePath}/milestones`}
              icon={AlertTriangleIcon}
              label='Overdue milestones'
              variant='destructive'
            />
          )}
        </NeedsAttentionCard>
      )}

      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        {canReadMilestones && (
          <StatCard
            href={`${basePath}/milestones`}
            icon={MilestoneIcon}
            label='Milestones'
            sublabel={
              milestones.length > 0
                ? `${milestonesCompleted}/${milestones.length} done${nextMilestone?.dueDate ? ` · next ${format(new Date(nextMilestone.dueDate), 'MMM d')}` : ''}`
                : undefined
            }
            value={
              milestones.length > 0
                ? `${milestoneCompletion}%`
                : milestones.length
            }
          />
        )}
        {canReadTimesheets && (
          <StatCard
            href={`${basePath}/timesheets`}
            icon={Clock}
            label='Time Logged'
            sublabel={
              budgetStatus
                ? `${budgetStatus.percentageUsed}% of budget used`
                : undefined
            }
            value={`${hoursLogged}h ${minutesLogged}m`}
          />
        )}
        {canReadInvoices && (
          <StatCard
            href={`${basePath}/invoices`}
            icon={FileSpreadsheet}
            label='Invoices'
            sublabel={
              invoices.length > 0
                ? `${invoicesPaid.length} paid · ${invoicesPending.length} sent · ${invoicesDraft.length} draft`
                : undefined
            }
            value={invoices.length}
          />
        )}
        {canReadExpenses && (
          <StatCard
            href={`${basePath}/expenses`}
            icon={Receipt}
            label='Expenses'
            sublabel={
              expenses.length > 0
                ? `${billableApprovedExpenses.length} billable · ${expensesPendingAdminApproval.length + expensesPendingClientApproval.length} pending`
                : undefined
            }
            value={expenses.length}
          />
        )}
      </div>

      {hasDetailGridContent && (
        <div className='grid gap-4 lg:grid-cols-2'>
          {canReadMilestones && milestonesInProgress.length > 0 && (
            <ActiveMilestonesCard
              basePath={basePath}
              milestones={milestonesInProgress}
            />
          )}
          {canReadRequirements && requirementsAwaitingSignature.length > 0 && (
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
      )}
    </div>
  )
}
