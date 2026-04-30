import type { z } from 'zod'
import type { timesheetService } from '@/app/api/timesheets/service'
import type {
  statusEnum,
  timeEntries,
  timesheetDurationEnum,
  timesheetReports,
} from '@/server/db/schema'
import type { ProjectClient } from '../team/types'
import type { timeEntryFormSchema } from './common'

export type TimeEntryFormValues = z.infer<typeof timeEntryFormSchema>

export type TimeEntry = typeof timeEntries.$inferSelect & {
  requirementSlug: string | null
  requirementTitle: string | null
  memberEmail: string
  memberName: string | null
}

export interface WeeklyTimesheetEntry {
  billable: boolean
  date: Date
  description: string
  durationMinutes: number
  id: string
  requirementId: string | null
  requirementTitle: string | null
  status: (typeof statusEnum.enumValues)[number]
}

export interface BudgetStatus {
  budget: {
    id: string
    projectId: string
    budgetMinutes: number
    alertThreshold: number
  }
  percentageUsed: number
  totalApprovedMinutes: number
}

export type MemberRate = Awaited<
  ReturnType<typeof timesheetService.getMemberRates>
>[number]

export interface Requirement {
  id: string
  slug: string
  title: string
}

export interface ProjectMember {
  email: string
  id: string
  name: string | null
}

export type TimesheetReportRecipient = Awaited<
  ReturnType<typeof timesheetService.getReportRecipientsBatch>
>[string][number]

export type TimesheetReport = typeof timesheetReports.$inferSelect
export type ReportEntryDetail = Awaited<
  ReturnType<typeof timesheetService.getReportEntriesBatch>
>[string][number]

export interface ClientReportWithEntries {
  entries: ReportEntryDetail[]
  report: TimesheetReport
}

export interface TimesheetReportDetail {
  entries: ReportEntryDetail[]
  report: TimesheetReport
}

export type TimesheetDuration =
  (typeof timesheetDurationEnum.enumValues)[number]

export interface TimeTrackingPageProps {
  budgetStatus: BudgetStatus | null
  clientReports: ClientReportWithEntries[]
  clients: ProjectClient[]
  currentMemberId: string
  defaultCurrency?: string
  entries: TimeEntry[]
  initialLogMinutes?: number
  isAdmin: boolean
  isClient: boolean
  isClientInvolved: boolean
  memberRates: MemberRate[]
  orgSlug: string
  projectId: string
  projectMembers: ProjectMember[]
  projectName: string
  projectSlug: string
  reportEntriesMap: Record<string, ReportEntryDetail[]>
  reportRecipientsMap: Record<string, TimesheetReportRecipient[]>
  requirements: Requirement[]
  timesheetDuration: TimesheetDuration
  timesheetReports: TimesheetReport[]
}
