import z from 'zod'
import type { TimeEntry } from './types'

/**
 * Format minutes as human-readable hours and minutes.
 * 12 → "12m", 60 → "1h", 90 → "1h 30m", 150 → "2h 30m"
 */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) {
    return `${m}m`
  }
  if (m === 0) {
    return `${h}h`
  }
  return `${h}h ${m}m`
}

export function formatShortDate(
  date: string | Date,
  options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
): string {
  return new Date(date).toLocaleDateString('en-US', options)
}

export function canEditTimeEntry(
  entry: TimeEntry,
  currentMemberId: string,
  isAdmin: boolean
): boolean {
  if (isAdmin) {
    return true
  }
  if (entry.memberId !== currentMemberId) {
    return false
  }
  return entry.status === 'draft' || entry.status === 'admin_rejected'
}

export function canDeleteTimeEntry(
  entry: TimeEntry,
  currentMemberId: string,
  isAdmin: boolean
): boolean {
  if (isAdmin) {
    return true
  }
  if (entry.memberId !== currentMemberId) {
    return false
  }
  return entry.status === 'draft'
}

export const createTimeEntrySchema = z.object({
  projectId: z.string().min(1),
  requirementId: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
  date: z.string().min(1, 'Date is required'),
  durationMinutes: z.number().int().positive('Duration must be positive'),
  billable: z.boolean().default(true),
})

export const updateTimeEntrySchema = z.object({
  timeEntryId: z.string().min(1),
  requirementId: z.string().nullable().optional(),
  description: z.string().min(1).optional(),
  date: z.string().min(1).optional(),
  durationMinutes: z.number().int().positive().optional(),
  billable: z.boolean().optional(),
})

export const deleteTimeEntrySchema = z.object({
  timeEntryId: z.string().min(1),
})

export const submitTimesheetSchema = z.object({
  timeEntryIds: z.array(z.string().min(1)).min(1, 'Select at least one entry'),
})

export const approveTimeEntriesSchema = z.object({
  timeEntryIds: z.array(z.string().min(1)).min(1),
})

export const rejectTimeEntriesSchema = z.object({
  timeEntryIds: z.array(z.string().min(1)).min(1),
  reason: z.string().min(1, 'Reason is required'),
})

export const setMemberRateSchema = z.object({
  memberId: z.string().min(1),
  projectId: z.string().nullable().optional(),
  hourlyRate: z.number().int().positive('Rate must be positive'),
  currency: z.string().min(1).default('USD'),
  effectiveFrom: z.string().min(1, 'Effective date is required'),
})

export const setProjectBudgetSchema = z.object({
  projectId: z.string().min(1),
  budgetMinutes: z.number().int().positive('Budget must be positive'),
  alertThreshold: z.number().int().min(1).max(100).default(80),
})

export const linkTimeEntriesToInvoiceSchema = z.object({
  timeEntryIds: z.array(z.string().min(1)).min(1),
  invoiceId: z.string().min(1),
})

export const sendTimesheetToClientSchema = z.object({
  projectId: z.string().min(1),
  clientMemberIds: z.array(z.string().min(1)).min(1),
  title: z.string().min(1, 'Title is required'),
  timeEntryIds: z.array(z.string().min(1)).min(1),
  currency: z.string().min(1).default('USD'),
})

export const respondTimesheetReportSchema = z.object({
  reportId: z.string().min(1),
  action: z.enum(['approve', 'dispute']),
  reason: z.string().optional(),
})

export const resendTimesheetReportSchema = z.object({
  reportId: z.string().min(1),
})

export const timeEntryFormSchema = z.object({
  requirementId: z.string(),
  description: z.string().min(1, 'Description is required'),
  date: z.string().min(1, 'Date is required'),
  durationInput: z.string().min(1, 'Duration is required'),
  billable: z.boolean(),
})

export const memberRateFormSchema = z.object({
  memberId: z.string().min(1, 'Member is required'),
  hourlyRate: z.string().min(1, 'Hourly rate is required'),
  currency: z.string().min(1, 'Currency is required'),
  effectiveFrom: z.string().min(1, 'Effective date is required'),
  isProjectSpecific: z.boolean(),
})

export const projectBudgetFormSchema = z.object({
  budgetHours: z.string().min(1, 'Budget is required'),
  alertThreshold: z.number().int().min(1).max(100),
})

export type ProjectBudgetFormValues = z.infer<typeof projectBudgetFormSchema>
export type MemberRateFormValues = z.infer<typeof memberRateFormSchema>
