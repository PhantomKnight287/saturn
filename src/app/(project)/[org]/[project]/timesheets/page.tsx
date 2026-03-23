import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { resolveProjectContext } from '@/app/(organization)/[org]/cache'
import { requirementsService } from '@/app/api/requirements/service'
import { teamService } from '@/app/api/teams/service'
import { timesheetService } from '@/app/api/timesheets/service'
import { TimeTrackingClient } from './page.client'

export default async function TimeTracking({
  params,
}: PageProps<'/[org]/[project]/timesheets'>) {
  const { org, project: projectSlug } = await params
  const {
    organization,
    project: currentProject,
    orgMember,
    role,
  } = await resolveProjectContext(org, projectSlug)

  const isClient = orgMember.role === 'client'
  const isAdmin = orgMember.role === 'owner' || orgMember.role === 'admin'

  const canReadTimeEntries = role.authorize({ time_entry: ['read'] }).success
  const canReadReports = role.authorize({
    timesheet_report: ['read'],
  }).success

  if (!(canReadTimeEntries || canReadReports)) {
    redirect(
      `/error?message=${encodeURIComponent('You do not have permission to view timesheets')}`
    )
  }

  const h = await headers()

  const [
    entries,
    requirementsList,
    projectMembers,
    budgetStatus,
    rates,
    reports,
    clients,
  ] = await Promise.all([
    canReadTimeEntries
      ? timesheetService.listByProject(currentProject.id, h)
      : Promise.resolve([]),
    requirementsService.listByProject(currentProject.id, h),
    teamService.getProjectMembers(currentProject.id),
    timesheetService.getProjectBudgetStatus(currentProject.id),
    isAdmin
      ? timesheetService.getMemberRates(organization.id)
      : Promise.resolve([]),
    isAdmin
      ? timesheetService.listReportsByProject(currentProject.id)
      : Promise.resolve([]),
    isAdmin
      ? teamService.getProjectClients(currentProject.id)
      : Promise.resolve([]),
  ])

  // Fetch report entries for admin view
  const reportEntriesMap =
    isAdmin && reports.length > 0
      ? await timesheetService.getReportEntriesBatch(reports.map((r) => r.id))
      : {}

  const clientReports: {
    report: {
      id: string
      title: string
      status: 'draft' | 'sent' | 'approved' | 'disputed'
      totalMinutes: number
      totalAmount: number
      currency: string
      clientMemberId: string
      sentByMemberId: string | null
      disputeReason: string | null
      sentAt: Date | null
      respondedAt: Date | null
      createdAt: Date
      projectId: string
      clientName: string | null
      clientEmail: string
    }
    entries: {
      id: string
      memberId: string
      description: string
      date: Date
      durationMinutes: number
      billable: boolean
      memberName: string | null
      requirementTitle: string | null
    }[]
  }[] = []

  if (isClient) {
    const rawReports = await timesheetService.listReportsForClient(orgMember.id)
    const reportIds = rawReports.map((r) => r.id)
    const entriesMap = await timesheetService.getReportEntriesBatch(reportIds)
    for (const report of rawReports) {
      clientReports.push({
        report: {
          ...report,
          clientName: null,
          clientEmail: '',
        },
        entries: entriesMap[report.id] ?? [],
      })
    }
  }

  return (
    <TimeTrackingClient
      budgetStatus={budgetStatus}
      clientReports={clientReports}
      clients={clients.map((c) => ({
        memberId: c.memberId,
        userName: c.userName,
        userEmail: c.userEmail,
      }))}
      currentMemberId={orgMember.id}
      entries={entries}
      isAdmin={isAdmin}
      isClient={isClient}
      memberRates={rates}
      orgSlug={org}
      projectId={currentProject.id}
      projectMembers={projectMembers.map((m) => ({
        id: m.memberId,
        name: m.userName,
        email: m.userEmail,
      }))}
      projectName={currentProject.name}
      projectSlug={projectSlug}
      reportEntriesMap={reportEntriesMap}
      requirements={requirementsList.map((r) => ({
        id: r.id,
        title: r.title,
        slug: r.slug,
      }))}
      timesheetReports={reports}
    />
  )
}
