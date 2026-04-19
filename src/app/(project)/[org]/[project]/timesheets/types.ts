import type { z } from 'zod'
import type {
  statusEnum,
  timeEntries,
  timesheetDurationEnum,
  timesheetReportRecipientStatusEnum,
  timesheetReportStatusEnum,
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

export interface MemberRate {
  createdAt: Date
  currency: string
  effectiveFrom: Date
  hourlyRate: number
  id: string
  memberEmail: string
  memberId: string
  memberName: string | null
  projectId: string | null
}

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

export interface TimesheetReportRecipient {
  clientEmail: string
  clientMemberId: string
  clientName: string | null
  disputeReason: string | null
  id: string
  respondedAt: Date | null
  status: (typeof timesheetReportRecipientStatusEnum.enumValues)[number]
}

export interface TimesheetReport {
  createdAt: Date
  currency: string
  disputeReason: string | null
  id: string
  projectId: string
  respondedAt: Date | null
  sentAt: Date | null
  sentByMemberId: string | null
  status: (typeof timesheetReportStatusEnum.enumValues)[number]
  title: string
  totalAmount: number
  totalMinutes: number
}

export interface ReportEntryDetail {
  billable: boolean
  date: Date
  description: string
  durationMinutes: number
  id: string
  memberId: string
  memberName: string | null
  requirementTitle: string | null
}

export interface ClientReportWithEntries {
  entries: ReportEntryDetail[]
  report: TimesheetReport
}

export interface TimesheetReportDetail {
  entries: ReportEntryDetail[]
  report: {
    id: string
    projectId: string
    title: string
    status: (typeof timesheetReportStatusEnum.enumValues)[number]
    totalMinutes: number
    totalAmount: number
    currency: string
    sentByMemberId: string | null
    disputeReason: string | null
    sentAt: Date | null
    respondedAt: Date | null
  }
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
  isAdmin: boolean
  isClient: boolean
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
