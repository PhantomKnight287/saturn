import { and, asc, desc, eq, gte, inArray, isNull, lte, sum } from 'drizzle-orm'
import type { ReadonlyHeaders } from 'next/dist/server/web/spec-extension/adapters/headers'
import { getCachedActiveOrgMember } from '@/app/(organization)/[org]/cache'
import { db } from '@/server/db'
import {
  memberRates,
  members,
  projectBudgets,
  requirements,
  timeEntries,
  timesheetReportEntries,
  timesheetReports,
  users,
} from '@/server/db/schema'

export interface ReportEntry {
  billable: boolean
  date: Date
  description: string
  durationMinutes: number
  id: string
  memberId: string
  memberName: string | null
  requirementTitle: string | null
}

interface ListFilters {
  billable?: boolean
  dateFrom?: string
  dateTo?: string
  memberId?: string
  requirementId?: string
  status?: string
}

const listByProject = async (
  projectId: string,
  headers: ReadonlyHeaders,
  filters?: ListFilters
) => {
  const activeMember = await getCachedActiveOrgMember(headers)
  const isAdmin =
    activeMember?.role === 'owner' || activeMember?.role === 'admin'

  const conditions = [eq(timeEntries.projectId, projectId)]

  if (!isAdmin && activeMember) {
    conditions.push(eq(timeEntries.memberId, activeMember.id))
  }

  if (filters?.memberId) {
    conditions.push(eq(timeEntries.memberId, filters.memberId))
  }
  if (filters?.status) {
    conditions.push(
      eq(
        timeEntries.status,
        filters.status as typeof timeEntries.$inferSelect.status
      )
    )
  }
  if (filters?.requirementId) {
    conditions.push(eq(timeEntries.requirementId, filters.requirementId))
  }
  if (filters?.billable !== undefined) {
    conditions.push(eq(timeEntries.billable, filters.billable))
  }
  if (filters?.dateFrom) {
    conditions.push(gte(timeEntries.date, new Date(filters.dateFrom)))
  }
  if (filters?.dateTo) {
    conditions.push(lte(timeEntries.date, new Date(filters.dateTo)))
  }

  const entries = await db
    .select({
      id: timeEntries.id,
      projectId: timeEntries.projectId,
      requirementId: timeEntries.requirementId,
      memberId: timeEntries.memberId,
      description: timeEntries.description,
      date: timeEntries.date,
      durationMinutes: timeEntries.durationMinutes,
      billable: timeEntries.billable,
      status: timeEntries.status,
      rejectReason: timeEntries.rejectReason,
      invoiceId: timeEntries.invoiceId,
      createdAt: timeEntries.createdAt,
      updatedAt: timeEntries.updatedAt,
      memberName: users.name,
      memberEmail: users.email,
      requirementTitle: requirements.title,
      requirementSlug: requirements.slug,
    })
    .from(timeEntries)
    .innerJoin(members, eq(timeEntries.memberId, members.id))
    .innerJoin(users, eq(members.userId, users.id))
    .leftJoin(requirements, eq(timeEntries.requirementId, requirements.id))
    .where(and(...conditions))
    .orderBy(desc(timeEntries.date), desc(timeEntries.createdAt))

  return entries as (Omit<
    (typeof entries)[number],
    'requirementTitle' | 'requirementSlug'
  > & { requirementSlug: string; requirementTitle: string })[]
}

const getById = async (timeEntryId: string, projectId: string) => {
  const [entry] = await db
    .select({
      id: timeEntries.id,
      projectId: timeEntries.projectId,
      requirementId: timeEntries.requirementId,
      memberId: timeEntries.memberId,
      description: timeEntries.description,
      date: timeEntries.date,
      durationMinutes: timeEntries.durationMinutes,
      billable: timeEntries.billable,
      status: timeEntries.status,
      invoiceId: timeEntries.invoiceId,
      createdAt: timeEntries.createdAt,
      updatedAt: timeEntries.updatedAt,
      memberName: users.name,
      memberEmail: users.email,
      requirementTitle: requirements.title,
    })
    .from(timeEntries)
    .innerJoin(members, eq(timeEntries.memberId, members.id))
    .innerJoin(users, eq(members.userId, users.id))
    .leftJoin(requirements, eq(timeEntries.requirementId, requirements.id))
    .where(
      and(eq(timeEntries.id, timeEntryId), eq(timeEntries.projectId, projectId))
    )

  return entry ?? null
}

const getWeeklyTimesheet = async (
  projectId: string,
  memberId: string,
  weekStart: string
) => {
  const startDate = new Date(weekStart)
  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + 6)

  const entries = await db
    .select({
      id: timeEntries.id,
      requirementId: timeEntries.requirementId,
      description: timeEntries.description,
      date: timeEntries.date,
      durationMinutes: timeEntries.durationMinutes,
      billable: timeEntries.billable,
      status: timeEntries.status,
      requirementTitle: requirements.title,
    })
    .from(timeEntries)
    .leftJoin(requirements, eq(timeEntries.requirementId, requirements.id))
    .where(
      and(
        eq(timeEntries.projectId, projectId),
        eq(timeEntries.memberId, memberId),
        gte(timeEntries.date, startDate),
        lte(timeEntries.date, endDate)
      )
    )
    .orderBy(asc(timeEntries.date))

  return entries
}

const getProjectBudgetStatus = async (projectId: string) => {
  const [budget] = await db
    .select()
    .from(projectBudgets)
    .where(eq(projectBudgets.projectId, projectId))

  if (!budget) {
    return null
  }

  const [result] = await db
    .select({
      totalMinutes: sum(timeEntries.durationMinutes),
    })
    .from(timeEntries)
    .where(
      and(
        eq(timeEntries.projectId, projectId),
        eq(timeEntries.status, 'admin_accepted')
      )
    )

  const totalApprovedMinutes = Number(result?.totalMinutes ?? 0)
  const percentageUsed = Math.round(
    (totalApprovedMinutes / budget.budgetMinutes) * 100
  )

  return {
    budget,
    totalApprovedMinutes,
    percentageUsed,
  }
}

const getMemberRate = async (
  memberId: string,
  projectId: string,
  date: string
) => {
  const targetDate = new Date(date)

  const [projectRate] = await db
    .select()
    .from(memberRates)
    .where(
      and(
        eq(memberRates.memberId, memberId),
        eq(memberRates.projectId, projectId),
        lte(memberRates.effectiveFrom, targetDate)
      )
    )
    .orderBy(desc(memberRates.effectiveFrom))
    .limit(1)

  if (projectRate) {
    return projectRate
  }

  const [orgRate] = await db
    .select()
    .from(memberRates)
    .where(
      and(
        eq(memberRates.memberId, memberId),
        isNull(memberRates.projectId),
        lte(memberRates.effectiveFrom, targetDate)
      )
    )
    .orderBy(desc(memberRates.effectiveFrom))
    .limit(1)

  return orgRate ?? null
}

const getBillableSummary = async (projectId: string) => {
  const entries = await db
    .select({
      id: timeEntries.id,
      memberId: timeEntries.memberId,
      requirementId: timeEntries.requirementId,
      description: timeEntries.description,
      date: timeEntries.date,
      durationMinutes: timeEntries.durationMinutes,
      invoiceId: timeEntries.invoiceId,
      memberName: users.name,
      requirementTitle: requirements.title,
    })
    .from(timeEntries)
    .innerJoin(members, eq(timeEntries.memberId, members.id))
    .innerJoin(users, eq(members.userId, users.id))
    .leftJoin(requirements, eq(timeEntries.requirementId, requirements.id))
    .where(
      and(
        eq(timeEntries.projectId, projectId),
        eq(timeEntries.status, 'admin_accepted'),
        eq(timeEntries.billable, true),
        isNull(timeEntries.invoiceId)
      )
    )
    .orderBy(asc(users.name), asc(timeEntries.date))

  return entries
}

const getMemberRates = async (organizationId: string) => {
  const rates = await db
    .select({
      id: memberRates.id,
      memberId: memberRates.memberId,
      projectId: memberRates.projectId,
      hourlyRate: memberRates.hourlyRate,
      currency: memberRates.currency,
      effectiveFrom: memberRates.effectiveFrom,
      createdAt: memberRates.createdAt,
      memberName: users.name,
      memberEmail: users.email,
    })
    .from(memberRates)
    .innerJoin(members, eq(memberRates.memberId, members.id))
    .innerJoin(users, eq(members.userId, users.id))
    .where(eq(members.organizationId, organizationId))
    .orderBy(desc(memberRates.effectiveFrom))

  return rates
}

const getProjectBudget = async (projectId: string) => {
  const [budget] = await db
    .select()
    .from(projectBudgets)
    .where(eq(projectBudgets.projectId, projectId))

  return budget ?? null
}

const listReportsByProject = async (projectId: string) => {
  const reports = await db
    .select({
      id: timesheetReports.id,
      projectId: timesheetReports.projectId,
      title: timesheetReports.title,
      status: timesheetReports.status,
      totalMinutes: timesheetReports.totalMinutes,
      totalAmount: timesheetReports.totalAmount,
      currency: timesheetReports.currency,
      disputeReason: timesheetReports.disputeReason,
      sentAt: timesheetReports.sentAt,
      respondedAt: timesheetReports.respondedAt,
      createdAt: timesheetReports.createdAt,
      clientMemberId: timesheetReports.clientMemberId,
      clientName: users.name,
      clientEmail: users.email,
      sentByMemberId: timesheetReports.sentByMemberId,
    })
    .from(timesheetReports)
    .innerJoin(members, eq(timesheetReports.clientMemberId, members.id))
    .innerJoin(users, eq(members.userId, users.id))
    .where(eq(timesheetReports.projectId, projectId))
    .orderBy(desc(timesheetReports.createdAt))

  return reports
}

const listReportsForClient = async (clientMemberId: string) => {
  const reports = await db
    .select({
      id: timesheetReports.id,
      projectId: timesheetReports.projectId,
      title: timesheetReports.title,
      status: timesheetReports.status,
      totalMinutes: timesheetReports.totalMinutes,
      totalAmount: timesheetReports.totalAmount,
      currency: timesheetReports.currency,
      disputeReason: timesheetReports.disputeReason,
      sentAt: timesheetReports.sentAt,
      respondedAt: timesheetReports.respondedAt,
      createdAt: timesheetReports.createdAt,
      clientMemberId: timesheetReports.clientMemberId,
      sentByMemberId: timesheetReports.sentByMemberId,
    })
    .from(timesheetReports)
    .where(eq(timesheetReports.clientMemberId, clientMemberId))
    .orderBy(desc(timesheetReports.createdAt))

  return reports
}

const getReportEntriesBatch = async (reportIds: string[]) => {
  if (reportIds.length === 0) {
    return {} as Record<string, ReportEntry[]>
  }

  const rows = await db
    .select({
      reportId: timesheetReportEntries.reportId,
      id: timeEntries.id,
      memberId: timeEntries.memberId,
      description: timeEntries.description,
      date: timeEntries.date,
      durationMinutes: timeEntries.durationMinutes,
      billable: timeEntries.billable,
      memberName: users.name,
      requirementTitle: requirements.title,
    })
    .from(timesheetReportEntries)
    .innerJoin(
      timeEntries,
      eq(timesheetReportEntries.timeEntryId, timeEntries.id)
    )
    .innerJoin(members, eq(timeEntries.memberId, members.id))
    .innerJoin(users, eq(members.userId, users.id))
    .leftJoin(requirements, eq(timeEntries.requirementId, requirements.id))
    .where(inArray(timesheetReportEntries.reportId, reportIds))
    .orderBy(asc(timeEntries.date))

  const grouped = new Map<string, ReportEntry[]>()
  for (const row of rows) {
    if (!grouped.has(row.reportId)) {
      grouped.set(row.reportId, [])
    }
    grouped.get(row.reportId)!.push({
      id: row.id,
      memberId: row.memberId,
      description: row.description,
      date: row.date,
      durationMinutes: row.durationMinutes,
      billable: row.billable,
      memberName: row.memberName,
      requirementTitle: row.requirementTitle,
    })
  }
  return Object.fromEntries(grouped) as Record<string, ReportEntry[]>
}

const getReportById = async (reportId: string, projectId: string) => {
  const [report] = await db
    .select()
    .from(timesheetReports)
    .where(
      and(
        eq(timesheetReports.id, reportId),
        eq(timesheetReports.projectId, projectId)
      )
    )
  if (!report) {
    return null
  }

  const entryLinks = await db
    .select({ timeEntryId: timesheetReportEntries.timeEntryId })
    .from(timesheetReportEntries)
    .where(eq(timesheetReportEntries.reportId, reportId))

  const entryIds = entryLinks.map((e) => e.timeEntryId)
  if (entryIds.length === 0) {
    return { report, entries: [] }
  }

  const entries = await db
    .select({
      id: timeEntries.id,
      description: timeEntries.description,
      date: timeEntries.date,
      durationMinutes: timeEntries.durationMinutes,
      billable: timeEntries.billable,
      memberName: users.name,
      requirementTitle: requirements.title,
    })
    .from(timeEntries)
    .innerJoin(members, eq(timeEntries.memberId, members.id))
    .innerJoin(users, eq(members.userId, users.id))
    .leftJoin(requirements, eq(timeEntries.requirementId, requirements.id))
    .where(inArray(timeEntries.id, entryIds))
    .orderBy(asc(timeEntries.date))

  return { report, entries }
}
const getBillableEntriesForReport = async (reportId: string) => {
  const entries = await db
    .select({
      id: timeEntries.id,
      memberId: timeEntries.memberId,
      requirementId: timeEntries.requirementId,
      description: timeEntries.description,
      date: timeEntries.date,
      durationMinutes: timeEntries.durationMinutes,
      invoiceId: timeEntries.invoiceId,
      memberName: users.name,
      requirementTitle: requirements.title,
    })
    .from(timesheetReportEntries)
    .innerJoin(
      timeEntries,
      eq(timesheetReportEntries.timeEntryId, timeEntries.id)
    )
    .innerJoin(members, eq(timeEntries.memberId, members.id))
    .innerJoin(users, eq(members.userId, users.id))
    .leftJoin(requirements, eq(timeEntries.requirementId, requirements.id))
    .where(eq(timesheetReportEntries.reportId, reportId))
    .orderBy(asc(users.name), asc(timeEntries.date))

  return entries
}

export const timesheetService = {
  listByProject,
  getById,
  getWeeklyTimesheet,
  getProjectBudgetStatus,
  getMemberRate,
  getBillableSummary,
  getBillableEntriesForReport,
  getMemberRates,
  getProjectBudget,
  listReportsByProject,
  listReportsForClient,
  getReportById,
  getReportEntriesBatch,
}
