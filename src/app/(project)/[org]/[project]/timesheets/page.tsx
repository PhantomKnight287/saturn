import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createLoader, parseAsInteger } from 'nuqs/server'
import { resolveProjectContext } from '@/app/(organization)/[org]/cache'
import { projectsService } from '@/app/api/projects/service'
import { requirementsService } from '@/app/api/requirements/service'
import { teamService } from '@/app/api/teams/service'
import { timesheetService } from '@/app/api/timesheets/service'

import { createMetadata } from '@/lib/metadata'
import { TimeTrackingClient } from './page.client'
import { teamEntriesSearchParams } from './search-params'
import type { ClientReportWithEntries } from './types'

const TEAM_PAGE_SIZE = 25

const loadSearchParams = createLoader({
  logMinutes: parseAsInteger,
  ...teamEntriesSearchParams,
})

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
  searchParams,
}: PageProps<'/[org]/[project]/timesheets'>) {
  const { org, project: projectSlug } = await params
  const { logMinutes, page, member, status, requirement } =
    await loadSearchParams(searchParams)
  let initialLogMinutes: number | undefined
  if (logMinutes !== null && Number.isSafeInteger(logMinutes)) {
    initialLogMinutes = Math.max(1, logMinutes)
  }
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
      `/error/403?message=${encodeURIComponent('You do not have permission to view timesheets')}`
    )
  }

  const teamFilters = {
    ...(member !== 'all' && { memberId: member }),
    ...(status !== 'all' && { status }),
    ...(requirement !== 'all' && { requirementId: requirement }),
  }

  const [
    myEntries,
    teamData,
    submittedEntries,
    requirementsList,
    projectMembers,
    budgetStatus,
    rates,
    reports,
    clients,
    settings,
    projectCustomFields,
  ] = await Promise.all([
    canReadTimeEntries
      ? timesheetService.listByProject({
          memberId: orgMember.id,
          role: orgMember.role,
          projectId: currentProject.id,
          filters: { memberId: orgMember.id },
        })
      : Promise.resolve([]),
    isAdmin && canReadTimeEntries
      ? timesheetService.listTeamEntriesPage({
          projectId: currentProject.id,
          filters: teamFilters,
          page,
          pageSize: TEAM_PAGE_SIZE,
        })
      : Promise.resolve({ entries: [], total: 0, totalMinutes: 0 }),
    isAdmin && canReadTimeEntries
      ? timesheetService.listByProject({
          memberId: orgMember.id,
          role: orgMember.role,
          projectId: currentProject.id,
          filters: { status: 'submitted_to_admin' },
        })
      : Promise.resolve([]),
    requirementsService.listByProject({
      memberId: orgMember.id,
      role: orgMember.role,
      projectId: currentProject.id,
    }),
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
    timesheetService.getProjectCustomFields(currentProject.id, orgMember.role),
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

  let clientReports: ClientReportWithEntries[] = []

  if (isClient) {
    const rawReports = await timesheetService.listReportsForClient(
      orgMember.id,
      currentProject.id
    )
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
      customFields={projectCustomFields}
      defaultCurrency={settings.currency}
      initialLogMinutes={initialLogMinutes}
      isAdmin={isAdmin}
      isClient={isClient}
      isClientInvolved={settings.clientInvolvement.timesheets === 'on'}
      memberRates={rates}
      myEntries={myEntries}
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
      submittedEntries={submittedEntries}
      teamEntries={teamData.entries}
      teamPage={page}
      teamPageSize={TEAM_PAGE_SIZE}
      teamTotal={teamData.total}
      teamTotalMinutes={teamData.totalMinutes}
      timesheetDuration={settings.timesheetDuration}
      timesheetReports={reports}
    />
  )
}
