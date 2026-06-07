import { render } from '@react-email/render'
import {
  and,
  asc,
  count,
  desc,
  eq,
  getTableColumns,
  gte,
  inArray,
  isNull,
  lte,
  ne,
  sum,
} from 'drizzle-orm'
import { projectsService } from '@/app/api/projects/service'
import BudgetThresholdReachedEmail from '@/emails/templates/budget-threshold-reached'
import TimesheetApprovedEmail from '@/emails/templates/timesheet-approved'
import TimesheetClientRespondedEmail from '@/emails/templates/timesheet-client-responded'
import TimesheetRejectedEmail from '@/emails/templates/timesheet-rejected'
import TimesheetSentToClientEmail from '@/emails/templates/timesheet-sent-to-client'
import TimesheetSubmittedEmail from '@/emails/templates/timesheet-submitted'
import { computeEntryAmount } from '@/lib/billing'
import {
  buildCustomValuesSchema,
  type CustomFieldDefinition,
} from '@/lib/custom-fields'
import { getAdminsAndOwners, sendEmailsToRecipients } from '@/lib/notifications'
import {
  type ActiveMember,
  type Project,
  projectAccess,
} from '@/server/access/project-access'
import { customFieldsService } from '@/server/custom-fields/service'
import { db } from '@/server/db'
import {
  invoices,
  memberRates,
  members,
  projectBudgets,
  projectClientAssignments,
  requirements,
  timeEntries,
  timesheetReportEntries,
  timesheetReportRecipients,
  timesheetReports,
  users,
} from '@/server/db/schema'
import { currencyConversionService } from '@/services/currency-conversion.service'
import type { Role } from '@/types'

const validateCustomValues = (
  defs: CustomFieldDefinition[],
  input: Record<string, unknown> | undefined
): Record<string, unknown> => {
  if (defs.length === 0) {
    return {}
  }
  const filtered: Record<string, unknown> = {}
  const allowed = new Set(defs.map((d) => d.id))
  for (const [k, v] of Object.entries(input ?? {})) {
    if (allowed.has(k)) {
      filtered[k] = v
    }
  }
  const schema = buildCustomValuesSchema(defs)
  const result = schema.safeParse(filtered)
  if (!result.success) {
    const first = result.error.issues[0]
    const path = first?.path?.join('.') ?? ''
    const def = defs.find((d) => d.id === path)
    const label = def ? def.label : path
    throw new Error(
      `Custom field "${label}": ${first?.message ?? 'invalid value'}`
    )
  }
  return result.data
}

const assertSingleProject = (entries: Array<{ projectId: string }>): string => {
  const projectIds = new Set(entries.map((e) => e.projectId))
  if (projectIds.size !== 1) {
    throw new Error('All entries must belong to the same project')
  }
  return [...projectIds][0]!
}

const formatWeekLabel = (dates: string[]): string => {
  if (dates.length === 0) {
    return ''
  }
  const sorted = [...dates].sort()
  const first = sorted.at(0)!
  const last = sorted.at(-1)!
  const fmt = (d: string) => {
    const [y, m, day] = d.split('-').map(Number)
    return new Date(y!, m! - 1, day!).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    })
  }
  const year = last.split('-').at(0)
  return `${fmt(first)} – ${fmt(last)}, ${year}`
}

interface ListFilters {
  billable?: boolean
  dateFrom?: string
  dateTo?: string
  memberId?: string
  requirementId?: string
  status?: string
}

const listByProject = async ({
  projectId,
  filters,
  role,
  memberId,
}: {
  projectId: string
  filters?: ListFilters
  role: Role
  memberId: string
}) => {
  const isAdmin = role === 'owner' || role === 'admin'

  const conditions = [eq(timeEntries.projectId, projectId)]

  if (!isAdmin) {
    conditions.push(eq(timeEntries.memberId, memberId))
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
    conditions.push(gte(timeEntries.date, filters.dateFrom))
  }
  if (filters?.dateTo) {
    conditions.push(lte(timeEntries.date, filters.dateTo))
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
      customValues: timeEntries.customValues,
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

const listTeamEntriesPage = async ({
  projectId,
  filters,
  page,
  pageSize,
}: {
  projectId: string
  filters?: ListFilters
  page: number
  pageSize: number
}) => {
  const conditions = [
    eq(timeEntries.projectId, projectId),
    ne(timeEntries.status, 'draft'),
  ]

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
  if (filters?.requirementId === 'general') {
    conditions.push(isNull(timeEntries.requirementId))
  } else if (filters?.requirementId) {
    conditions.push(eq(timeEntries.requirementId, filters.requirementId))
  }

  const where = and(...conditions)

  const [entries, [totals]] = await Promise.all([
    db
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
        customValues: timeEntries.customValues,
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
      .where(where)
      .orderBy(desc(timeEntries.date), desc(timeEntries.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({
        total: count(),
        totalMinutes: sum(timeEntries.durationMinutes),
      })
      .from(timeEntries)
      .where(where),
  ])

  return {
    entries: entries as (Omit<
      (typeof entries)[number],
      'requirementTitle' | 'requirementSlug'
    > & { requirementSlug: string; requirementTitle: string })[],
    total: totals?.total ?? 0,
    totalMinutes: Number(totals?.totalMinutes ?? 0),
  }
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
  const startDate = weekStart
  const end = new Date(`${weekStart}T00:00:00Z`)
  end.setUTCDate(end.getUTCDate() + 6)
  const endDate = end.toISOString().slice(0, 10)

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
        inArray(timeEntries.status, ['admin_accepted', 'client_accepted'])
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
  const [projectRate] = await db
    .select()
    .from(memberRates)
    .where(
      and(
        eq(memberRates.memberId, memberId),
        eq(memberRates.projectId, projectId),
        lte(memberRates.effectiveFrom, date)
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
        lte(memberRates.effectiveFrom, date)
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
        eq(timeEntries.status, 'client_accepted'),
        eq(timeEntries.billable, true),
        isNull(timeEntries.invoiceId)
      )
    )
    .orderBy(asc(users.name), asc(timeEntries.date))

  return entries
}

const getMemberRates = async (organizationId: string) => {
  const {
    payCurrency,
    payFrequency,
    payRate,
    billingCurrency,
    billingFrequency,
    billingRate,
  } = getTableColumns(memberRates)
  const rates = await db
    .select({
      id: memberRates.id,
      memberId: memberRates.memberId,
      projectId: memberRates.projectId,
      payCurrency,
      payFrequency,
      payRate,
      billingCurrency,
      billingFrequency,
      billingRate,
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
      updatedAt: timesheetReports.updatedAt,
      sentByMemberId: timesheetReports.sentByMemberId,
    })
    .from(timesheetReports)
    .where(eq(timesheetReports.projectId, projectId))
    .orderBy(desc(timesheetReports.createdAt))
  return reports
}

const listReportsForClient = async (
  clientMemberId: string,
  projectId: string
) => {
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
      updatedAt: timesheetReports.updatedAt,
      sentByMemberId: timesheetReports.sentByMemberId,
    })
    .from(timesheetReportRecipients)
    .innerJoin(
      timesheetReports,
      eq(timesheetReportRecipients.reportId, timesheetReports.id)
    )
    .where(
      and(
        eq(timesheetReportRecipients.clientMemberId, clientMemberId),
        eq(timesheetReports.projectId, projectId)
      )
    )
    .orderBy(desc(timesheetReports.createdAt))

  return reports
}

const getReportEntriesBatch = async (reportIds: string[]) => {
  interface Row {
    billable: boolean
    createdAt: Date
    customValues: Record<string, unknown>
    date: string
    description: string
    durationMinutes: number
    id: string
    invoiceId: string | null
    memberId: string
    memberName: string | null
    reportId: string
    requirementTitle: string | null
    timeEntryId: string
    updatedAt: Date
  }

  if (reportIds.length === 0) {
    return {} as Record<string, Row[]>
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
      timeEntryId: timeEntries.id,
      createdAt: timesheetReportEntries.createdAt,
      updatedAt: timesheetReportEntries.updatedAt,
      invoiceId: timeEntries.invoiceId,
      customValues: timeEntries.customValues,
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

  const grouped = new Map<string, Row[]>()
  for (const row of rows) {
    const list = grouped.get(row.reportId)
    if (list) {
      list.push(row)
    } else {
      grouped.set(row.reportId, [row])
    }
  }
  return Object.fromEntries(grouped)
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
const getBillableEntriesForReport = async (
  reportId: string,
  memberId?: string
) => {
  const conditions = [eq(timesheetReportEntries.reportId, reportId)]
  if (memberId) {
    conditions.push(eq(timeEntries.memberId, memberId))
  }

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
    .where(and(...conditions))
    .orderBy(asc(users.name), asc(timeEntries.date))

  return entries
}

const getReportRecipientsBatch = async (reportIds: string[]) => {
  if (reportIds.length === 0) {
    return {} as Record<
      string,
      {
        id: string
        clientMemberId: string
        clientName: string | null
        clientEmail: string
        status: 'pending' | 'approved' | 'disputed'
        disputeReason: string | null
        respondedAt: Date | null
      }[]
    >
  }

  const rows = await db
    .select({
      reportId: timesheetReportRecipients.reportId,
      id: timesheetReportRecipients.id,
      clientMemberId: timesheetReportRecipients.clientMemberId,
      clientName: users.name,
      clientEmail: users.email,
      status: timesheetReportRecipients.status,
      disputeReason: timesheetReportRecipients.disputeReason,
      respondedAt: timesheetReportRecipients.respondedAt,
    })
    .from(timesheetReportRecipients)
    .innerJoin(
      members,
      eq(timesheetReportRecipients.clientMemberId, members.id)
    )
    .innerJoin(users, eq(members.userId, users.id))
    .where(inArray(timesheetReportRecipients.reportId, reportIds))

  const grouped = new Map<string, (typeof rows)[number][]>()
  for (const row of rows) {
    if (!grouped.has(row.reportId)) {
      grouped.set(row.reportId, [])
    }
    grouped.get(row.reportId)!.push(row)
  }
  return Object.fromEntries(grouped) as Record<string, (typeof rows)[number][]>
}

const listByProjectIdsSince = async (
  projectIds: string[],
  since: Date,
  memberId?: string
) => {
  if (projectIds.length === 0) {
    return []
  }

  return await db
    .select({
      projectId: timeEntries.projectId,
      durationMinutes: timeEntries.durationMinutes,
    })
    .from(timeEntries)
    .where(
      and(
        inArray(timeEntries.projectId, projectIds),
        gte(timeEntries.date, since.toISOString().slice(0, 10)),
        memberId ? eq(timeEntries.memberId, memberId) : undefined
      )
    )
}

const getEntryForEdit = async (entryId: string, projectId: string) => {
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
      rejectReason: timeEntries.rejectReason,
      invoiceId: timeEntries.invoiceId,
      customValues: timeEntries.customValues,
      createdAt: timeEntries.createdAt,
      updatedAt: timeEntries.updatedAt,
      requirementSlug: requirements.slug,
      requirementTitle: requirements.title,
      memberEmail: users.email,
      memberName: users.name,
    })
    .from(timeEntries)
    .leftJoin(requirements, eq(requirements.id, timeEntries.requirementId))
    .leftJoin(members, eq(members.id, timeEntries.memberId))
    .leftJoin(users, eq(users.id, members.userId))
    .where(
      and(eq(timeEntries.id, entryId), eq(timeEntries.projectId, projectId))
    )
    .limit(1)

  return entry ?? null
}

const getProjectCustomFields = (projectId: string, role: Role) =>
  customFieldsService.getProjectFields(projectId, role)

/**
 * Ensures a member has a usable rate before their entries are approved.
 * Returns if a member rate already exists. Otherwise seeds a project-level
 * rate from the org/project default rates. The pay rate is the required
 * value: a null or 0 default pay rate is treated as "not configured" and
 * throws. When the default billing rate is unset (null/0), the pay rate's
 * value is used for billing too.
 */
const ensureMemberRate = async (
  memberId: string,
  projectId: string,
  asOf: string,
  settings: Awaited<ReturnType<typeof projectsService.getSettings>>
): Promise<void> => {
  const existing = await getMemberRate(memberId, projectId, asOf)
  if (existing) {
    return
  }
  // Pay rate is required; treat 0 (and null) as "not configured".
  if (!settings.payRate) {
    throw new Error(
      'No member rate or default pay rate is configured. Please set a member rate or a default pay rate before approving.'
    )
  }
  // Fall back to the pay rate for billing when no billing rate is configured.
  const billingConfigured = !!settings.billingRate
  // The existence check above guards the common case. Concurrent approvals
  // could still both insert a same-day rate; readers tolerate duplicates by
  // taking the latest effectiveFrom, so a plain insert is fine.
  await db.insert(memberRates).values({
    memberId,
    projectId,
    billingRate: billingConfigured ? settings.billingRate : settings.payRate,
    billingCurrency: billingConfigured
      ? settings.billingCurrency
      : settings.payCurrency,
    billingFrequency: billingConfigured
      ? settings.billingFrequency
      : settings.payFrequency,
    payRate: settings.payRate,
    payCurrency: settings.payCurrency,
    payFrequency: settings.payFrequency,
    effectiveFrom: asOf,
  })
}

/**
 * Sum the billing amount for report entries, converting each entry to the
 * report currency at the member's rate effective on the entry's own date
 * (memoised per member+date so totals stay correct across rate changes).
 */
const computeReportTotalCents = async (
  entries: { memberId: string; date: string; durationMinutes: number }[],
  projectId: string,
  reportCurrency: string
): Promise<number> => {
  const rateCache = new Map<string, Awaited<ReturnType<typeof getMemberRate>>>()
  const resolveRate = async (memberId: string, date: string) => {
    const key = `${memberId}|${date}`
    if (!rateCache.has(key)) {
      rateCache.set(key, await getMemberRate(memberId, projectId, date))
    }
    return rateCache.get(key)
  }
  let total = 0
  for (const entry of entries) {
    const rate = await resolveRate(entry.memberId, entry.date)
    if (!rate) {
      continue
    }
    const entryAmount = computeEntryAmount(
      entry.durationMinutes,
      rate.billingRate ?? rate.payRate,
      rate.billingFrequency ?? rate.payFrequency ?? 'hourly'
    )
    const entryCurrency =
      rate.billingRate == null ? rate.payCurrency : rate.billingCurrency
    if (!entryCurrency) {
      continue
    }
    const { amount } = await currencyConversionService.convertCents(
      entryAmount,
      entryCurrency,
      reportCurrency
    )
    total += amount
  }
  return total
}

const checkBudgetThreshold = async (
  projectId: string,
  organizationId: string
) => {
  const budgetStatus = await getProjectBudgetStatus(projectId)
  if (!budgetStatus) {
    return
  }

  const { budget, percentageUsed, totalApprovedMinutes } = budgetStatus

  if (percentageUsed >= budget.alertThreshold) {
    const details = await projectsService.getProjectDetails(projectId)
    const recipients = await getAdminsAndOwners(organizationId)

    await sendEmailsToRecipients(recipients, async (recipient) => {
      const html = await render(
        BudgetThresholdReachedEmail({
          recipientName: recipient.name ?? 'there',
          projectName: details.projectName,
          organizationName: details.orgName,
          percentageUsed,
          hoursUsed: (totalApprovedMinutes / 60).toFixed(1),
          hoursTotal: (budget.budgetMinutes / 60).toFixed(1),
          orgSlug: details.orgSlug ?? '',
          projectSlug: details.projectSlug,
        })
      )
      return {
        to: recipient.email,
        subject: `Budget alert — ${percentageUsed}% used`,
        html,
      }
    })
  }
}

type TimeEntryWritable = Pick<
  typeof timeEntries.$inferInsert,
  | 'requirementId'
  | 'description'
  | 'date'
  | 'durationMinutes'
  | 'billable'
  | 'customValues'
>

const createEntry = async ({
  project,
  orgMember,
  requirementId,
  description,
  date,
  durationMinutes,
  billable,
  customValues,
}: { project: Project; orgMember: ActiveMember } & TimeEntryWritable) => {
  const projectId = project.id
  const organizationId = project.organizationId
  const isAdmin = orgMember.role === 'owner' || orgMember.role === 'admin'
  const settings = await projectsService.getSettings(organizationId, projectId)
  const clientOff = settings.clientInvolvement.timesheets === 'off'

  // Admin/owner entries are auto-approved, so they must clear the same rate
  // requirement as the approval flow before the entry is created.
  if (isAdmin) {
    await ensureMemberRate(orgMember.id, projectId, date, settings)
  }

  const defs = await customFieldsService.getProjectFields(projectId)
  const validatedCustomValues = validateCustomValues(defs, customValues)

  const [entry] = await db
    .insert(timeEntries)
    .values({
      projectId,
      requirementId: requirementId || null,
      memberId: orgMember.id,
      description,
      date,
      durationMinutes,
      billable,
      customValues: validatedCustomValues,
      status: isAdmin
        ? clientOff
          ? 'client_accepted'
          : 'admin_accepted'
        : 'draft',
    })
    .returning()

  if (isAdmin) {
    await checkBudgetThreshold(projectId, organizationId)
  }

  return entry
}

const updateEntry = async ({
  timeEntryId,
  orgMember,
  requirementId,
  description,
  date,
  durationMinutes,
  billable,
  customValues,
}: {
  timeEntryId: string
  orgMember: ActiveMember
  requirementId?: string | null
  description?: string
  date?: string
  durationMinutes?: number
  billable?: boolean
  customValues?: Record<string, unknown>
}) => {
  const existing = await db
    .select({
      id: timeEntries.id,
      projectId: timeEntries.projectId,
      memberId: timeEntries.memberId,
      status: timeEntries.status,
      invoiceId: timeEntries.invoiceId,
    })
    .from(timeEntries)
    .where(eq(timeEntries.id, timeEntryId))
    .then((r) => r.at(0))

  if (!existing) {
    throw new Error('Time entry not found')
  }
  await projectAccess.assert(
    existing.projectId,
    orgMember,
    'Time entry not found'
  )

  // Once an entry is part of a sent report or an invoice, editing it would
  // silently diverge from what the client already saw and from the cached
  // report/invoice totals, so it is frozen for everyone — admins included.
  if (
    existing.invoiceId ||
    existing.status === 'submitted_to_client' ||
    existing.status === 'client_accepted'
  ) {
    throw new Error(
      'This entry has been sent to a client or invoiced and can no longer be edited'
    )
  }

  const isAdmin = orgMember.role === 'owner' || orgMember.role === 'admin'

  if (!isAdmin && existing.memberId !== orgMember.id) {
    throw new Error('You can only edit your own time entries')
  }

  if (
    !isAdmin &&
    existing.status !== 'draft' &&
    existing.status !== 'client_rejected'
  ) {
    throw new Error('Only draft or rejected entries can be edited')
  }

  const updates: Partial<typeof timeEntries.$inferInsert> = {}
  if (requirementId !== undefined) {
    updates.requirementId = requirementId || null
  }
  if (description !== undefined) {
    updates.description = description
  }
  if (date !== undefined) {
    updates.date = date
  }
  if (durationMinutes !== undefined) {
    updates.durationMinutes = durationMinutes
  }
  if (billable !== undefined) {
    updates.billable = billable
  }
  if (customValues !== undefined) {
    const defs = await customFieldsService.getProjectFields(existing.projectId)
    updates.customValues = validateCustomValues(defs, customValues)
  }
  // Reset rejected entries to draft when edited so they can be resubmitted
  if (existing.status === 'client_rejected' && !isAdmin) {
    updates.status = 'draft'
    updates.rejectReason = null
  }

  const [updated] = await db
    .update(timeEntries)
    .set(updates)
    .where(eq(timeEntries.id, timeEntryId))
    .returning()

  return updated
}

const deleteEntry = async ({
  timeEntryId,
  orgMember,
}: {
  timeEntryId: string
  orgMember: ActiveMember
}) => {
  const existing = await db
    .select({
      id: timeEntries.id,
      projectId: timeEntries.projectId,
      memberId: timeEntries.memberId,
      status: timeEntries.status,
    })
    .from(timeEntries)
    .where(eq(timeEntries.id, timeEntryId))
    .then((r) => r.at(0))

  if (!existing) {
    throw new Error('Time entry not found')
  }
  await projectAccess.assert(
    existing.projectId,
    orgMember,
    'Time entry not found'
  )

  const isAdmin = orgMember.role === 'owner' || orgMember.role === 'admin'

  if (!isAdmin && existing.memberId !== orgMember.id) {
    throw new Error('You can only delete your own time entries')
  }

  if (!isAdmin && existing.status !== 'draft') {
    throw new Error('Only draft entries can be deleted')
  }

  await db.delete(timeEntries).where(eq(timeEntries.id, timeEntryId))

  return { success: true }
}

const submit = async ({
  timeEntryIds,
  orgMember,
}: {
  timeEntryIds: string[]
  orgMember: ActiveMember
}) => {
  const entries = await db
    .select()
    .from(timeEntries)
    .where(inArray(timeEntries.id, timeEntryIds))

  if (entries.length === 0) {
    throw new Error('No time entries found')
  }
  if (entries.length !== timeEntryIds.length) {
    throw new Error('Some of the selected time entries could not be found')
  }

  const projectId = assertSingleProject(entries)
  await projectAccess.assert(projectId, orgMember, 'No time entries found')

  for (const entry of entries) {
    if (entry.memberId !== orgMember.id) {
      throw new Error('You can only submit your own time entries')
    }
    if (entry.status !== 'draft') {
      throw new Error('Only draft entries can be submitted')
    }
  }

  await db
    .update(timeEntries)
    .set({ status: 'submitted_to_admin' })
    .where(inArray(timeEntries.id, timeEntryIds))

  const totalMinutes = entries.reduce((sum, e) => sum + e.durationMinutes, 0)
  const totalHours = (totalMinutes / 60).toFixed(1)

  const details = await projectsService.getProjectDetails(projectId)
  const recipients = await getAdminsAndOwners(orgMember.organizationId)

  await sendEmailsToRecipients(recipients, async (recipient) => {
    const html = await render(
      TimesheetSubmittedEmail({
        recipientName: recipient.name ?? 'there',
        memberName: orgMember.user.name ?? 'there',
        projectName: details.projectName,
        totalHours,
        weekLabel: formatWeekLabel(entries.map((e) => e.date)),
        entryCount: entries.length,
        orgSlug: details.orgSlug ?? '',
        projectSlug: details.projectSlug,
      })
    )
    return {
      to: recipient.email,
      subject: `Timesheet submitted — ${orgMember.user.name ?? 'A member'} (${totalHours}h)`,
      html,
    }
  })

  return { success: true }
}

const approve = async ({
  timeEntryIds,
  orgMember,
}: {
  timeEntryIds: string[]
  orgMember: ActiveMember
}) => {
  const entries = await db
    .select()
    .from(timeEntries)
    .where(inArray(timeEntries.id, timeEntryIds))

  if (entries.length === 0) {
    throw new Error('No time entries found')
  }
  if (entries.length !== timeEntryIds.length) {
    throw new Error('Some of the selected time entries could not be found')
  }

  const projectId = assertSingleProject(entries)
  await projectAccess.assert(projectId, orgMember, 'No time entries found')

  for (const entry of entries) {
    if (entry.status !== 'submitted_to_admin') {
      throw new Error('Only submitted entries can be approved')
    }
  }

  const approveSettings = await projectsService.getSettings(
    orgMember.organizationId,
    projectId
  )

  // Each member needs a rate before approval — seed from the org/project
  // defaults when missing, effective from their earliest entry so it covers
  // every entry being approved. Throws if no default is configured.
  const memberIds = [...new Set(entries.map((e) => e.memberId))]
  for (const id of memberIds) {
    const earliest = entries
      .filter((e) => e.memberId === id)
      .reduce(
        (min, e) => (e.date < min ? e.date : min),
        entries.find((e) => e.memberId === id)!.date
      )
    await ensureMemberRate(id, projectId, earliest, approveSettings)
  }
  const approvedStatus =
    approveSettings.clientInvolvement.timesheets === 'off'
      ? 'client_accepted'
      : 'admin_accepted'

  await db
    .update(timeEntries)
    .set({ status: approvedStatus })
    .where(inArray(timeEntries.id, timeEntryIds))

  const details = await projectsService.getProjectDetails(projectId)

  for (const memberId of memberIds) {
    const memberEntries = entries.filter((e) => e.memberId === memberId)
    const memberMinutes = memberEntries.reduce(
      (sum, e) => sum + e.durationMinutes,
      0
    )
    const [recipientMember] = await db
      .select({ email: users.email, name: users.name })
      .from(members)
      .innerJoin(users, eq(members.userId, users.id))
      .where(eq(members.id, memberId))

    if (recipientMember) {
      await sendEmailsToRecipients([recipientMember], async (recipient) => {
        const html = await render(
          TimesheetApprovedEmail({
            recipientName: recipient.name ?? 'there',
            approverName: orgMember.user.name ?? 'there',
            projectName: details.projectName,
            totalHours: (memberMinutes / 60).toFixed(1),
            weekLabel: formatWeekLabel(memberEntries.map((e) => e.date)),
            entryCount: memberEntries.length,
            orgSlug: details.orgSlug ?? '',
            projectSlug: details.projectSlug,
          })
        )
        return {
          to: recipient.email,
          subject: `Timesheet approved — ${(memberMinutes / 60).toFixed(1)}h`,
          html,
        }
      })
    }
  }

  await checkBudgetThreshold(projectId, orgMember.organizationId)

  return { success: true }
}

const reject = async ({
  timeEntryIds,
  reason,
  orgMember,
}: {
  timeEntryIds: string[]
  reason: string
  orgMember: ActiveMember
}) => {
  const entries = await db
    .select()
    .from(timeEntries)
    .where(inArray(timeEntries.id, timeEntryIds))

  if (entries.length === 0) {
    throw new Error('No time entries found')
  }
  if (entries.length !== timeEntryIds.length) {
    throw new Error('Some of the selected time entries could not be found')
  }

  const projectId = assertSingleProject(entries)
  await projectAccess.assert(projectId, orgMember, 'No time entries found')

  for (const entry of entries) {
    if (entry.status !== 'submitted_to_admin') {
      throw new Error('Only submitted entries can be rejected')
    }
  }

  await db
    .update(timeEntries)
    .set({ status: 'admin_rejected', rejectReason: reason })
    .where(inArray(timeEntries.id, timeEntryIds))

  const details = await projectsService.getProjectDetails(projectId)

  const memberIds = [...new Set(entries.map((e) => e.memberId))]
  for (const memberId of memberIds) {
    const memberEntries = entries.filter((e) => e.memberId === memberId)
    const memberMinutes = memberEntries.reduce(
      (sum, e) => sum + e.durationMinutes,
      0
    )
    const [recipientMember] = await db
      .select({ email: users.email, name: users.name })
      .from(members)
      .innerJoin(users, eq(members.userId, users.id))
      .where(eq(members.id, memberId))

    if (recipientMember) {
      await sendEmailsToRecipients([recipientMember], async (recipient) => {
        const html = await render(
          TimesheetRejectedEmail({
            recipientName: recipient.name ?? 'there',
            rejectorName: orgMember.user.name ?? 'there',
            projectName: details.projectName,
            totalHours: (memberMinutes / 60).toFixed(1),
            weekLabel: formatWeekLabel(memberEntries.map((e) => e.date)),
            reason,
            orgSlug: details.orgSlug ?? '',
            projectSlug: details.projectSlug,
          })
        )
        return {
          to: recipient.email,
          subject: 'Timesheet rejected — changes requested',
          html,
        }
      })
    }
  }

  return { success: true }
}

const setMemberRate = async ({
  memberId,
  projectId,
  orgMember,
  effectiveFrom,
  billingCurrency,
  billingFrequency,
  billingRate,
  payCurrency,
  payFrequency,
  payRate,
}: {
  memberId: string
  projectId?: string | null
  orgMember: ActiveMember
  effectiveFrom: string
  billingCurrency: string
  billingFrequency: typeof memberRates.$inferInsert.billingFrequency
  billingRate: number
  payCurrency: string
  payFrequency: typeof memberRates.$inferInsert.payFrequency
  payRate: number
}) => {
  // Verify the target member belongs to this org before writing — with
  // projectId null this would otherwise be a cross-tenant write path.
  const [targetMember] = await db
    .select({ id: members.id })
    .from(members)
    .where(
      and(
        eq(members.id, memberId),
        eq(members.organizationId, orgMember.organizationId)
      )
    )
  if (!targetMember) {
    throw new Error('Member not found')
  }

  if (projectId) {
    const granted = await projectAccess.check(
      projectId,
      orgMember.organizationId,
      orgMember
    )
    if (!granted) {
      throw new Error('You do not have access to this project')
    }
  }

  const resolvedProjectId = projectId || null

  const [existing] = await db
    .select({ id: memberRates.id })
    .from(memberRates)
    .where(
      and(
        eq(memberRates.memberId, memberId),
        resolvedProjectId
          ? eq(memberRates.projectId, resolvedProjectId)
          : isNull(memberRates.projectId),
        eq(memberRates.effectiveFrom, effectiveFrom)
      )
    )

  let rate: typeof memberRates.$inferSelect | undefined
  if (existing) {
    const [newRate] = await db
      .update(memberRates)
      .set({
        billingCurrency,
        billingFrequency,
        billingRate,
        payCurrency,
        payFrequency,
        payRate,
      })
      .where(eq(memberRates.id, existing.id))
      .returning()
    rate = newRate ?? undefined
  } else {
    const [newRate] = await db
      .insert(memberRates)
      .values({
        memberId,
        projectId: resolvedProjectId,
        billingCurrency,
        billingFrequency,
        billingRate,
        payCurrency,
        payFrequency,
        payRate,
        effectiveFrom,
      })
      .returning()
    rate = newRate ?? undefined
  }

  return rate
}

const setProjectBudget = async ({
  projectId,
  budgetMinutes,
  alertThreshold,
}: {
  projectId: string
  budgetMinutes: number
  alertThreshold: number
}) => {
  const existing = await db
    .select({ id: projectBudgets.id })
    .from(projectBudgets)
    .where(eq(projectBudgets.projectId, projectId))
    .then((r) => r.at(0))

  let budget: typeof projectBudgets.$inferSelect | undefined
  if (existing) {
    ;[budget] = await db
      .update(projectBudgets)
      .set({ budgetMinutes, alertThreshold })
      .where(eq(projectBudgets.id, existing.id))
      .returning()
  } else {
    ;[budget] = await db
      .insert(projectBudgets)
      .values({ projectId, budgetMinutes, alertThreshold })
      .returning()
  }

  return budget
}

const linkToInvoice = async ({
  timeEntryIds,
  invoiceId,
  orgMember,
}: {
  timeEntryIds: string[]
  invoiceId: string
  orgMember: ActiveMember
}) => {
  const entries = await db
    .select({ id: timeEntries.id, projectId: timeEntries.projectId })
    .from(timeEntries)
    .where(inArray(timeEntries.id, timeEntryIds))
  if (entries.length === 0) {
    throw new Error('No time entries found')
  }
  if (entries.length !== timeEntryIds.length) {
    throw new Error('Some of the selected time entries could not be found')
  }

  const projectId = assertSingleProject(entries)
  await projectAccess.assert(projectId, orgMember, 'No time entries found')

  // Confirm the invoice belongs to the same project as the entries — otherwise
  // a user could attach entries to an invoice in a project they don't own.
  const [invoice] = await db
    .select({ projectId: invoices.projectId })
    .from(invoices)
    .where(eq(invoices.id, invoiceId))
  if (!invoice || invoice.projectId !== projectId) {
    throw new Error('Invoice not found in this project')
  }

  await db
    .update(timeEntries)
    .set({ invoiceId })
    .where(inArray(timeEntries.id, timeEntryIds))

  return { success: true }
}

const sendToClient = async ({
  project,
  orgMember,
  clientMemberIds,
  title,
  timeEntryIds,
}: {
  project: Project
  orgMember: ActiveMember
  clientMemberIds: string[]
  title: string
  timeEntryIds: string[]
}) => {
  const projectId = project.id
  const organizationId = project.organizationId
  if (clientMemberIds.length === 0) {
    throw new Error('At least one client member is required')
  }
  const settings = await projectsService.getSettings(organizationId, projectId)
  if (settings.clientInvolvement.timesheets === 'off') {
    throw new Error(
      'Client involvement is disabled for timesheets in this project'
    )
  }

  const entries = await db
    .select()
    .from(timeEntries)
    .where(
      and(
        inArray(timeEntries.id, timeEntryIds),
        eq(timeEntries.projectId, projectId)
      )
    )
  if (entries.length !== timeEntryIds.length) {
    throw new Error(
      'Some of the time entries do not belong to the selected project.'
    )
  }
  for (const entry of entries) {
    if (entry.status !== 'admin_accepted') {
      throw new Error('Only approved entries can be sent to clients')
    }
  }

  const validRecipients = await db
    .select({ id: members.id })
    .from(members)
    .innerJoin(
      projectClientAssignments,
      and(
        eq(projectClientAssignments.memberId, members.id),
        eq(projectClientAssignments.projectId, projectId)
      )
    )
    .where(
      and(
        inArray(members.id, clientMemberIds),
        eq(members.organizationId, organizationId),
        eq(members.role, 'client')
      )
    )

  if (validRecipients.length !== clientMemberIds.length) {
    throw new Error(
      'One or more recipients are not assigned as clients on this project'
    )
  }

  const totalMinutes = entries.reduce((sum, e) => sum + e.durationMinutes, 0)
  const reportCurrency = settings.currency
  const totalAmountCents = await computeReportTotalCents(
    entries,
    projectId,
    reportCurrency
  )

  const report = await db.transaction(async (tx) => {
    const [r] = await tx
      .insert(timesheetReports)
      .values({
        projectId,
        title,
        totalMinutes,
        totalAmount: totalAmountCents,
        currency: reportCurrency,
        sentByMemberId: orgMember.id,
        status: 'sent',
        sentAt: new Date(),
      })
      .returning()

    if (!r) {
      throw new Error('Failed to create timesheet report')
    }

    await tx
      .insert(timesheetReportRecipients)
      .values(
        clientMemberIds.map((clientMemberId) => ({
          reportId: r.id,
          clientMemberId,
          status: 'pending' as const,
        }))
      )
      .onConflictDoNothing()

    await tx.insert(timesheetReportEntries).values(
      timeEntryIds.map((teId) => ({
        reportId: r.id,
        timeEntryId: teId,
      }))
    )
    await tx
      .update(timeEntries)
      .set({ status: 'submitted_to_client' })
      .where(inArray(timeEntries.id, timeEntryIds))

    return r
  })

  const details = await projectsService.getProjectDetails(projectId)

  const clients = await db
    .select({ email: users.email, name: users.name })
    .from(members)
    .innerJoin(users, eq(members.userId, users.id))
    .where(inArray(members.id, clientMemberIds))

  if (clients.length > 0) {
    const totalHours = (totalMinutes / 60).toFixed(1)
    const totalAmountFormatted = (totalAmountCents / 100).toLocaleString(
      'en-US',
      { style: 'currency', currency: reportCurrency }
    )
    await sendEmailsToRecipients(clients, async (recipient) => {
      const html = await render(
        TimesheetSentToClientEmail({
          recipientName: recipient.name ?? 'there',
          senderName: orgMember.user.name ?? 'there',
          projectName: details.projectName,
          reportTitle: title,
          totalHours,
          totalAmount: totalAmountFormatted,
          currency: reportCurrency,
          orgSlug: details.orgSlug ?? '',
          projectSlug: details.projectSlug,
          reportId: report.id,
        })
      )
      return {
        to: recipient.email,
        subject: `Timesheet for review — ${title}`,
        html,
      }
    })
  }

  return report
}

const respondReport = async ({
  reportId,
  action,
  reason,
  orgMember,
}: {
  reportId: string
  action: 'approve' | 'dispute'
  reason?: string
  orgMember: ActiveMember
}) => {
  const [report] = await db
    .select({
      id: timesheetReports.id,
      projectId: timesheetReports.projectId,
      title: timesheetReports.title,
      status: timesheetReports.status,
      totalMinutes: timesheetReports.totalMinutes,
      sentByMemberId: timesheetReports.sentByMemberId,
    })
    .from(timesheetReports)
    .where(eq(timesheetReports.id, reportId))

  if (!report) {
    throw new Error('Report not found')
  }
  await projectAccess.assert(report.projectId, orgMember, 'Report not found')
  const settings = await projectsService.getSettings(
    orgMember.organizationId,
    report.projectId
  )
  if (settings.clientInvolvement.timesheets === 'off') {
    throw new Error(
      'Client involvement is disabled for timesheets in this project'
    )
  }
  if (report.status !== 'sent') {
    throw new Error('Only sent reports can be responded to')
  }

  const recipientStatus = action === 'approve' ? 'approved' : 'disputed'

  // The recipient update and the aggregate report/status promotion must run in
  // one transaction with the recipient rows locked, otherwise two clients
  // responding at once can both read a stale snapshot and leave a fully
  // approved report stuck in `sent`.
  await db.transaction(async (tx) => {
    const recipients = await tx
      .select({
        id: timesheetReportRecipients.id,
        clientMemberId: timesheetReportRecipients.clientMemberId,
        status: timesheetReportRecipients.status,
      })
      .from(timesheetReportRecipients)
      .where(eq(timesheetReportRecipients.reportId, reportId))
      .for('update')

    const currentRecipient = recipients.find(
      (r) => r.clientMemberId === orgMember.id
    )
    if (!currentRecipient) {
      throw new Error('Only assigned clients can respond to this report')
    }
    if (currentRecipient.status !== 'pending') {
      throw new Error('You have already responded to this report')
    }

    await tx
      .update(timesheetReportRecipients)
      .set({
        status: recipientStatus,
        disputeReason: action === 'dispute' ? (reason ?? null) : null,
        respondedAt: new Date(),
      })
      .where(eq(timesheetReportRecipients.id, currentRecipient.id))

    const entryLinks = await tx
      .select({ timeEntryId: timesheetReportEntries.timeEntryId })
      .from(timesheetReportEntries)
      .where(eq(timesheetReportEntries.reportId, reportId))
    const entryIds = entryLinks.map((e) => e.timeEntryId)

    if (action === 'dispute') {
      await tx
        .update(timesheetReports)
        .set({ status: 'disputed', respondedAt: new Date() })
        .where(eq(timesheetReports.id, reportId))
      if (entryIds.length > 0) {
        await tx
          .update(timeEntries)
          .set({ status: 'client_rejected' })
          .where(inArray(timeEntries.id, entryIds))
      }
      return
    }

    // Count this responder's just-applied approval alongside the locked
    // snapshot of the others.
    const totalApproved = recipients.filter(
      (r) => r.id === currentRecipient.id || r.status === 'approved'
    ).length

    if (totalApproved >= recipients.length) {
      await tx
        .update(timesheetReports)
        .set({ status: 'approved', respondedAt: new Date() })
        .where(eq(timesheetReports.id, reportId))
      if (entryIds.length > 0) {
        await tx
          .update(timeEntries)
          .set({ status: 'client_accepted' })
          .where(inArray(timeEntries.id, entryIds))
      }
    }
  })

  if (report.sentByMemberId) {
    const [sender] = await db
      .select({ email: users.email, name: users.name })
      .from(members)
      .innerJoin(users, eq(members.userId, users.id))
      .where(eq(members.id, report.sentByMemberId))

    if (sender) {
      const details = await projectsService.getProjectDetails(report.projectId)
      const totalHours = (report.totalMinutes / 60).toFixed(1)
      await sendEmailsToRecipients([sender], async (recipient) => {
        const html = await render(
          TimesheetClientRespondedEmail({
            recipientName: recipient.name ?? 'there',
            clientName: orgMember.user.name ?? 'there',
            projectName: details.projectName,
            reportTitle: report.title,
            totalHours,
            action: action === 'approve' ? 'approved' : 'disputed',
            disputeReason: reason,
            orgSlug: details.orgSlug ?? '',
            projectSlug: details.projectSlug,
            reportId: report.id,
          })
        )
        return {
          to: recipient.email,
          subject: `Timesheet ${action === 'approve' ? 'approved' : 'disputed'} — ${report.title}`,
          html,
        }
      })
    }
  }

  return { success: true }
}

const resendReport = async ({
  reportId,
  orgMember,
}: {
  reportId: string
  orgMember: ActiveMember
}) => {
  const [report] = await db
    .select({
      id: timesheetReports.id,
      projectId: timesheetReports.projectId,
      title: timesheetReports.title,
      status: timesheetReports.status,
      currency: timesheetReports.currency,
    })
    .from(timesheetReports)
    .where(eq(timesheetReports.id, reportId))

  if (!report) {
    throw new Error('Report not found')
  }
  await projectAccess.assert(report.projectId, orgMember, 'Report not found')

  const settings = await projectsService.getSettings(
    orgMember.organizationId,
    report.projectId
  )
  if (settings.clientInvolvement.timesheets === 'off') {
    throw new Error(
      'Client involvement is disabled for timesheets in this project'
    )
  }

  if (report.status !== 'disputed') {
    throw new Error('Only disputed reports can be resent')
  }

  const entryLinks = await db
    .select({ timeEntryId: timesheetReportEntries.timeEntryId })
    .from(timesheetReportEntries)
    .where(eq(timesheetReportEntries.reportId, reportId))

  const entryIds = entryLinks.map((e) => e.timeEntryId)
  const linkedEntries =
    entryIds.length > 0
      ? await db
          .select()
          .from(timeEntries)
          .where(inArray(timeEntries.id, entryIds))
      : []

  const totalMinutes = linkedEntries.reduce(
    (sum, e) => sum + e.durationMinutes,
    0
  )

  const reportCurrency = report.currency
  const totalAmountCents = await computeReportTotalCents(
    linkedEntries,
    report.projectId,
    reportCurrency
  )

  await db
    .update(timesheetReports)
    .set({
      status: 'sent',
      disputeReason: null,
      respondedAt: null,
      sentAt: new Date(),
      totalMinutes,
      totalAmount: totalAmountCents,
    })
    .where(eq(timesheetReports.id, reportId))

  await db
    .update(timesheetReportRecipients)
    .set({ status: 'pending', disputeReason: null, respondedAt: null })
    .where(eq(timesheetReportRecipients.reportId, reportId))

  const details = await projectsService.getProjectDetails(report.projectId)

  const recipients = await db
    .select({ clientMemberId: timesheetReportRecipients.clientMemberId })
    .from(timesheetReportRecipients)
    .where(eq(timesheetReportRecipients.reportId, reportId))

  const clientMemberIds = recipients.map((r) => r.clientMemberId)

  if (clientMemberIds.length > 0) {
    const clients = await db
      .select({ email: users.email, name: users.name })
      .from(members)
      .innerJoin(users, eq(members.userId, users.id))
      .where(inArray(members.id, clientMemberIds))

    if (clients.length > 0) {
      const totalHours = (totalMinutes / 60).toFixed(1)
      const totalAmountFormatted = (totalAmountCents / 100).toLocaleString(
        'en-US',
        { style: 'currency', currency: report.currency }
      )
      await sendEmailsToRecipients(clients, async (recipient) => {
        const html = await render(
          TimesheetSentToClientEmail({
            recipientName: recipient.name ?? 'there',
            senderName: orgMember.user.name ?? 'there',
            projectName: details.projectName,
            reportTitle: report.title,
            totalHours,
            totalAmount: totalAmountFormatted,
            currency: report.currency,
            orgSlug: details.orgSlug ?? '',
            projectSlug: details.projectSlug,
            reportId: report.id,
          })
        )
        return {
          to: recipient.email,
          subject: `Revised timesheet for review — ${report.title}`,
          html,
        }
      })
    }
  }

  return { success: true }
}

export const timesheetService = {
  getEntryForEdit,
  ensureMemberRate,
  getProjectCustomFields,
  listByProject,
  listTeamEntriesPage,
  listByProjectIdsSince,
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
  getReportRecipientsBatch,
  createEntry,
  updateEntry,
  deleteEntry,
  submit,
  approve,
  reject,
  setMemberRate,
  setProjectBudget,
  linkToInvoice,
  sendToClient,
  respondReport,
  resendReport,
}
