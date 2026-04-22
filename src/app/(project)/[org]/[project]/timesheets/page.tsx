import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { resolveProjectContext } from '@/app/(organization)/[org]/cache'
import { projectsService } from '@/app/api/projects/service'
import { requirementsService } from '@/app/api/requirements/service'
import { teamService } from '@/app/api/teams/service'
import { timesheetService } from '@/app/api/timesheets/service'

import { createMetadata } from '@/lib/metadata'
import { TimeTrackingClient } from './page.client'

export const metadata: Metadata = createMetadata({
  title: 'Timesheets',
  description: 'Log hours and track team productivity across the project.',
  openGraph: {
    images: ['/api/og?page=Timesheets'],
  },
  twitter: {
    images: ['/api/og?page=Timesheets'],
  },
})

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
    settings,
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
    projectsService.getSettings(organization.id, currentProject.id),
  ])

  const reportIds = reports.map((r) => r.id)

  const [reportEntriesMap, reportRecipientsMap] = await Promise.all([
    isAdmin && reportIds.length > 0
      ? timesheetService.getReportEntriesBatch(reportIds)
      : Promise.resolve({}),
    isAdmin && reportIds.length > 0
      ? timesheetService.getReportRecipientsBatch(reportIds)
      : Promise.resolve({}),
  ])

  let clientReports: {
    report: (typeof reports)[number]
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
    const clientReportIds = rawReports.map((r) => r.id)
    const entriesMap =
      await timesheetService.getReportEntriesBatch(clientReportIds)
    clientReports = rawReports.map((report) => ({
      report,
      entries: entriesMap[report.id] ?? [],
    }))
  }
  return (
    <TimeTrackingClient
      budgetStatus={budgetStatus}
      clientReports={clientReports}
      clients={clients}
      currentMemberId={orgMember.id}
      defaultCurrency={settings.currency}
      entries={entries}
      isAdmin={isAdmin}
      isClient={isClient}
      isClientInvolved={settings.clientInvolvement.timesheets === 'on'}
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
      reportRecipientsMap={reportRecipientsMap}
      requirements={requirementsList}
      timesheetDuration={settings.timesheetDuration}
      timesheetReports={reports}
    />
  )
}
