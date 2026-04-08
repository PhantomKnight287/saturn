import { format, formatDistanceToNow, isPast } from 'date-fns'
import {
  AlertTriangleIcon,
  ArrowRight,
  CalendarIcon,
  CircleDot,
  ClipboardList,
  Clock,
  FileSpreadsheet,
  FileText,
  Milestone as MilestoneIcon,
  Receipt,
  ShieldAlert,
  Users,
} from 'lucide-react'
import { headers } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { resolveProjectContext } from '@/app/(organization)/[org]/cache'
import { expensesServices } from '@/app/api/expenses/service'
import { invoicesService } from '@/app/api/invoices/service'
import { milestonesService } from '@/app/api/milestones/service'
import { proposalsService } from '@/app/api/proposals/service'
import { requirementsService } from '@/app/api/requirements/service'
import { teamService } from '@/app/api/teams/service'
import { timesheetService } from '@/app/api/timesheets/service'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { RouteImpl } from '@/types'

export default async function ProjectOverview({
  params,
}: PageProps<'/[org]/[project]'>) {
  const { org, project: projectSlug } = await params
  const { project, orgMember, role } = await resolveProjectContext(
    org,
    projectSlug
  )

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

  const basePath = `/${org}/${projectSlug}` as RouteImpl

  // Milestones
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

  // Time entries
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

  // Invoices
  const invoicesDisputed = invoices.filter((i) => i.status === 'disputed')
  const invoicesOverdue = invoices.filter(
    (i) => i.status === 'sent' && i.dueDate && isPast(new Date(i.dueDate))
  )
  const invoicesPending = invoices.filter((i) => i.status === 'sent')
  const invoicesPaid = invoices.filter((i) => i.status === 'paid')

  // Expenses
  const expensesPendingAdminApproval = expenses.filter(
    (e) => e.status === 'submitted_to_admin'
  )
  const expensesPendingClientApproval = expenses.filter(
    (e) => e.status === 'submitted_to_client'
  )

  // Requirements
  const requirementsAwaitingSignature = requirements.filter(
    (r) => r.status === 'submitted_to_client'
  )
  const requirementsWithChanges = requirements.filter(
    (r) => r.status === 'changes_requested'
  )

  // Proposals
  const proposalsAwaitingSignature = proposals.filter(
    (p) => p.status === 'submitted_to_client'
  )

  // Timesheet reports
  const reportsDisputed = timesheetReports.filter(
    (r) => r.status === 'disputed'
  )
  const reportsPendingApproval = timesheetReports.filter(
    (r) => r.status === 'sent'
  )

  // Build action items based on role
  type ActionItem = {
    label: string
    count: number
    href: string
    variant: 'destructive' | 'default' | 'outline'
    icon: React.ComponentType<{ className?: string }>
  }

  const actionItems: ActionItem[] = []

  if (isAdmin) {
    if (timesheetsPendingApproval.length > 0)
      actionItems.push({
        label: 'Timesheets pending approval',
        count: timesheetsPendingApproval.length,
        href: `${basePath}/timesheets`,
        variant: 'default',
        icon: Clock,
      })
    if (expensesPendingAdminApproval.length > 0)
      actionItems.push({
        label: 'Expenses pending approval',
        count: expensesPendingAdminApproval.length,
        href: `${basePath}/expenses`,
        variant: 'default',
        icon: Receipt,
      })
    if (invoicesDisputed.length > 0)
      actionItems.push({
        label: 'Disputed invoices',
        count: invoicesDisputed.length,
        href: `${basePath}/invoices`,
        variant: 'destructive',
        icon: FileSpreadsheet,
      })
    if (invoicesOverdue.length > 0)
      actionItems.push({
        label: 'Overdue invoices',
        count: invoicesOverdue.length,
        href: `${basePath}/invoices`,
        variant: 'destructive',
        icon: AlertTriangleIcon,
      })
    if (reportsDisputed.length > 0)
      actionItems.push({
        label: 'Disputed timesheet reports',
        count: reportsDisputed.length,
        href: `${basePath}/timesheets`,
        variant: 'destructive',
        icon: ShieldAlert,
      })
    if (requirementsWithChanges.length > 0)
      actionItems.push({
        label: 'Requirements with change requests',
        count: requirementsWithChanges.length,
        href: `${basePath}/requirements`,
        variant: 'default',
        icon: ClipboardList,
      })
  }

  if (isClient) {
    if (requirementsAwaitingSignature.length > 0)
      actionItems.push({
        label: 'Requirements awaiting your signature',
        count: requirementsAwaitingSignature.length,
        href: `${basePath}/requirements`,
        variant: 'default',
        icon: ClipboardList,
      })
    if (proposalsAwaitingSignature.length > 0)
      actionItems.push({
        label: 'Proposals awaiting your signature',
        count: proposalsAwaitingSignature.length,
        href: `${basePath}/proposals`,
        variant: 'default',
        icon: FileText,
      })
    if (reportsPendingApproval.length > 0)
      actionItems.push({
        label: 'Timesheet reports to review',
        count: reportsPendingApproval.length,
        href: `${basePath}/timesheets`,
        variant: 'default',
        icon: Clock,
      })
    if (expensesPendingClientApproval.length > 0)
      actionItems.push({
        label: 'Expenses to review',
        count: expensesPendingClientApproval.length,
        href: `${basePath}/expenses`,
        variant: 'default',
        icon: Receipt,
      })
  }

  if (!isClient && !isAdmin) {
    if (timesheetsRejected.length > 0)
      actionItems.push({
        label: 'Rejected timesheets to fix',
        count: timesheetsRejected.length,
        href: `${basePath}/timesheets`,
        variant: 'destructive',
        icon: Clock,
      })
  }

  // Blocked/overdue milestones are relevant for everyone
  if (canReadMilestones) {
    if (milestonesBlocked.length > 0)
      actionItems.push({
        label: 'Blocked milestones',
        count: milestonesBlocked.length,
        href: `${basePath}/milestones`,
        variant: 'destructive',
        icon: ShieldAlert,
      })
    if (milestonesOverdue.length > 0)
      actionItems.push({
        label: 'Overdue milestones',
        count: milestonesOverdue.length,
        href: `${basePath}/milestones`,
        variant: 'destructive',
        icon: AlertTriangleIcon,
      })
  }

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
          {project.dueDate && (
            <ProjectDueDate dueDate={new Date(project.dueDate)} />
          )}
          <Badge variant='outline'>
            <Users className='size-3' />
            {members.length} {members.length === 1 ? 'member' : 'members'}
            {clients.length > 0 &&
              ` · ${clients.length} ${clients.length === 1 ? 'client' : 'clients'}`}
          </Badge>
        </div>
      </div>

      {actionItems.length > 0 && (
        <Card className='border-amber-500/30 bg-amber-500/5'>
          <CardHeader>
            <CardTitle className='text-base'>Needs Attention</CardTitle>
          </CardHeader>
          <CardContent className='space-y-2'>
            {actionItems.map((item) => (
              <Link
                className='flex items-center justify-between rounded-lg border border-border bg-background p-3 transition-colors hover:bg-muted/50'
                href={item.href as RouteImpl}
                key={item.label}
              >
                <div className='flex items-center gap-3'>
                  <item.icon className='size-4 text-muted-foreground' />
                  <span className='text-sm'>{item.label}</span>
                </div>
                <div className='flex items-center gap-2'>
                  <Badge variant={item.variant}>{item.count}</Badge>
                  <ArrowRight className='size-4 text-muted-foreground' />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        {canReadMilestones && (
          <StatCard
            href={`${basePath}/milestones`}
            icon={MilestoneIcon}
            label='Milestones'
            sublabel={
              milestones.length > 0
                ? `${milestonesCompleted} done · ${milestonesInProgress.length} active`
                : undefined
            }
            value={milestones.length}
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
                ? `${invoicesPaid.length} paid · ${invoicesPending.length} pending`
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
            value={expenses.length}
          />
        )}
      </div>

      <div className='grid gap-4 lg:grid-cols-2'>
        {canReadMilestones && milestonesInProgress.length > 0 && (
          <Card>
            <CardHeader className='flex-row items-center justify-between'>
              <CardTitle className='flex items-center gap-2 text-base'>
                <MilestoneIcon className='size-4 text-muted-foreground' />
                Active Milestones
              </CardTitle>
              <Link
                className='text-muted-foreground text-xs hover:text-foreground'
                href={`${basePath}/milestones` as RouteImpl}
              >
                View all
              </Link>
            </CardHeader>
            <CardContent className='space-y-3'>
              {milestonesInProgress.slice(0, 5).map((m) => {
                const progressPercent =
                  m.progress.total > 0
                    ? Math.round((m.progress.signed / m.progress.total) * 100)
                    : 0
                const overdue = m.dueDate && isPast(new Date(m.dueDate))
                return (
                  <Link
                    className='flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50'
                    href={`${basePath}/milestones/${m.id}` as RouteImpl}
                    key={m.id}
                  >
                    <MilestoneStatusDot status={m.status} />
                    <div className='min-w-0 flex-1'>
                      <div className='flex items-center gap-2'>
                        <span className='truncate font-medium text-sm'>
                          {m.name}
                        </span>
                        {overdue && (
                          <Badge className='shrink-0' variant='destructive'>
                            Overdue
                          </Badge>
                        )}
                      </div>
                      {m.dueDate && !overdue && (
                        <p className='text-muted-foreground text-xs'>
                          Due {format(new Date(m.dueDate), 'MMM d')}
                        </p>
                      )}
                      {m.progress.total > 0 && (
                        <div className='mt-1 flex items-center gap-2'>
                          <div className='h-1.5 flex-1 overflow-hidden rounded-full bg-secondary'>
                            <div
                              className={cn(
                                'h-full rounded-full transition-all',
                                progressPercent === 100
                                  ? 'bg-emerald-500'
                                  : 'bg-primary'
                              )}
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                          <span className='shrink-0 text-muted-foreground text-xs'>
                            {m.progress.signed}/{m.progress.total}
                          </span>
                        </div>
                      )}
                    </div>
                  </Link>
                )
              })}
            </CardContent>
          </Card>
        )}

        {canReadRequirements && requirementsAwaitingSignature.length > 0 && (
          <Card>
            <CardHeader className='flex-row items-center justify-between'>
              <CardTitle className='flex items-center gap-2 text-base'>
                <ClipboardList className='size-4 text-muted-foreground' />
                Awaiting Signature
              </CardTitle>
              <Link
                className='text-muted-foreground text-xs hover:text-foreground'
                href={`${basePath}/requirements` as RouteImpl}
              >
                View all
              </Link>
            </CardHeader>
            <CardContent className='space-y-2'>
              {requirementsAwaitingSignature.slice(0, 5).map((r) => (
                <Link
                  className='flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-muted/50'
                  href={`${basePath}/requirements/${r.slug}` as RouteImpl}
                  key={r.id}
                >
                  <span className='truncate font-medium text-sm'>
                    {r.title}
                  </span>
                  <Badge variant='outline'>Sent for sign</Badge>
                </Link>
              ))}
            </CardContent>
          </Card>
        )}

        {canReadProposals && proposalsAwaitingSignature.length > 0 && (
          <Card>
            <CardHeader className='flex-row items-center justify-between'>
              <CardTitle className='flex items-center gap-2 text-base'>
                <FileText className='size-4 text-muted-foreground' />
                Proposals Pending
              </CardTitle>
              <Link
                className='text-muted-foreground text-xs hover:text-foreground'
                href={`${basePath}/proposals` as RouteImpl}
              >
                View all
              </Link>
            </CardHeader>
            <CardContent className='space-y-2'>
              {proposalsAwaitingSignature.slice(0, 5).map((p) => (
                <Link
                  className='flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-muted/50'
                  href={`${basePath}/proposals/${p.slug}` as RouteImpl}
                  key={p.id}
                >
                  <span className='truncate font-medium text-sm'>
                    {p.title}
                  </span>
                  <Badge variant='outline'>Awaiting signature</Badge>
                </Link>
              ))}
            </CardContent>
          </Card>
        )}

        {isAdmin && invoicesOverdue.length > 0 && (
          <Card>
            <CardHeader className='flex-row items-center justify-between'>
              <CardTitle className='flex items-center gap-2 text-base'>
                <AlertTriangleIcon className='size-4 text-destructive' />
                Overdue Invoices
              </CardTitle>
              <Link
                className='text-muted-foreground text-xs hover:text-foreground'
                href={`${basePath}/invoices` as RouteImpl}
              >
                View all
              </Link>
            </CardHeader>
            <CardContent className='space-y-2'>
              {invoicesOverdue.slice(0, 5).map((inv) => (
                <Link
                  className='flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-muted/50'
                  href={`${basePath}/invoices/${inv.id}` as RouteImpl}
                  key={inv.id}
                >
                  <div className='min-w-0'>
                    <span className='font-medium text-sm'>
                      {inv.invoiceNumber}
                    </span>
                    <p className='text-destructive text-xs'>
                      Due {formatDistanceToNow(new Date(inv.dueDate!))} ago
                    </p>
                  </div>
                  <span className='font-medium text-sm'>
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: inv.currency,
                    }).format(Number(inv.totalAmount))}
                  </span>
                </Link>
              ))}
            </CardContent>
          </Card>
        )}

        {isAdmin && budgetStatus && (
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2 text-base'>
                <Clock className='size-4 text-muted-foreground' />
                Budget
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='space-y-3'>
                <div className='flex items-baseline justify-between'>
                  <span className='font-semibold text-2xl'>
                    {budgetStatus.percentageUsed}%
                  </span>
                  <span className='text-muted-foreground text-sm'>used</span>
                </div>
                <div className='h-2 overflow-hidden rounded-full bg-secondary'>
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      budgetStatus.percentageUsed >= 90
                        ? 'bg-destructive'
                        : budgetStatus.percentageUsed >= 75
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                    )}
                    style={{
                      width: `${Math.min(budgetStatus.percentageUsed, 100)}%`,
                    }}
                  />
                </div>
                <p className='text-muted-foreground text-xs'>
                  {Math.floor(budgetStatus.totalApprovedMinutes / 60)}h{' '}
                  {budgetStatus.totalApprovedMinutes % 60}m of{' '}
                  {Math.floor(budgetStatus.budget.budgetMinutes / 60)}h budget
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {canReadReports && timesheetReports.length > 0 && (
          <Card>
            <CardHeader className='flex-row items-center justify-between'>
              <CardTitle className='flex items-center gap-2 text-base'>
                <CircleDot className='size-4 text-muted-foreground' />
                Timesheet Reports
              </CardTitle>
              <Link
                className='text-muted-foreground text-xs hover:text-foreground'
                href={`${basePath}/timesheets` as RouteImpl}
              >
                View all
              </Link>
            </CardHeader>
            <CardContent className='space-y-2'>
              {timesheetReports.slice(0, 5).map((r) => (
                <div
                  className='flex items-center justify-between rounded-lg border border-border p-3'
                  key={r.id}
                >
                  <div className='min-w-0'>
                    <span className='truncate font-medium text-sm'>
                      {r.title}
                    </span>
                    <p className='text-muted-foreground text-xs'>
                      {Math.floor(r.totalMinutes / 60)}h {r.totalMinutes % 60}m
                    </p>
                  </div>
                  <Badge
                    variant={
                      r.status === 'disputed'
                        ? 'destructive'
                        : r.status === 'approved'
                          ? 'default'
                          : 'outline'
                    }
                  >
                    {r.status}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  sublabel,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
  sublabel?: string
  href?: string
}) {
  const content = (
    <Card
      className={cn(
        'gap-0 p-4',
        href && 'transition-colors hover:border-primary/50'
      )}
    >
      <div className='flex items-center gap-2 text-muted-foreground'>
        <Icon className='size-4' />
        <span className='text-sm'>{label}</span>
      </div>
      <div className='mt-2 font-semibold text-2xl'>{value}</div>
      <p className='mt-1 text-muted-foreground text-xs'>
        {sublabel ?? '\u00A0'}
      </p>
    </Card>
  )

  if (href) {
    return <Link href={href as RouteImpl}>{content}</Link>
  }

  return content
}

function MilestoneStatusDot({
  status,
}: {
  status: 'pending' | 'in_progress' | 'completed' | 'blocked'
}) {
  return (
    <div
      className={cn(
        'size-2.5 shrink-0 rounded-full',
        status === 'completed' && 'bg-emerald-500',
        status === 'in_progress' && 'bg-blue-500',
        status === 'pending' && 'bg-muted-foreground/40',
        status === 'blocked' && 'bg-destructive'
      )}
    />
  )
}

function ProjectDueDate({ dueDate }: { dueDate: Date }) {
  const overdue = isPast(dueDate)

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-medium text-xs',
        overdue
          ? 'bg-destructive/10 text-destructive'
          : 'bg-muted text-muted-foreground'
      )}
    >
      {overdue ? (
        <AlertTriangleIcon className='size-3' />
      ) : (
        <CalendarIcon className='size-3' />
      )}
      {overdue
        ? `Overdue by ${formatDistanceToNow(dueDate)}`
        : `Due ${format(dueDate, 'MMM d, yyyy')}`}
    </div>
  )
}
