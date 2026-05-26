import z from 'zod'
import { billingFrequencyEnum } from '@/server/db/schema'
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

/**
 * Approximate number of working hours each billing frequency represents,
 * used to convert a non-hourly rate into an equivalent hourly rate.
 */
const HOURS_PER_FREQUENCY: Record<
  (typeof billingFrequencyEnum.enumValues)[number],
  number
> = {
  hourly: 1,
  weekly: 40,
  biweekly: 80,
  monthly: 160,
}

/**
 * Compute the billable amount in **cents** for a time entry, given its
 * duration in minutes and the member's billing rate (also in cents).
 *
 * The rate is normalised to an hourly figure based on its frequency, then
 * pro-rated by the logged duration (`/ 60` to go from minutes to hours).
 */
export function computeEntryAmount(
  durationMinutes: number,
  billingRate: number,
  billingFrequency: (typeof billingFrequencyEnum.enumValues)[number]
): number {
  const hours = HOURS_PER_FREQUENCY[billingFrequency] ?? 1
  const ratePerHour = billingRate / hours
  return Math.round((durationMinutes / 60) * ratePerHour)
}

export function formatShortDate(
  date: string | Date,
  options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
): string {
  return new Date(date).toLocaleDateString(undefined, options)
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
  customValues: z.record(z.string(), z.unknown()).optional(),
})

export const updateTimeEntrySchema = z.object({
  timeEntryId: z.string().min(1),
  requirementId: z.string().nullable().optional(),
  description: z.string().min(1).optional(),
  date: z.string().min(1).optional(),
  durationMinutes: z.number().int().positive().optional(),
  billable: z.boolean().optional(),
  customValues: z.record(z.string(), z.unknown()).optional(),
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

export const setMemberRateSchema = z
  .object({
    memberId: z.string().min(1),
    projectId: z.string().nullable().optional(),
    payRate: z.number().positive(),
    payFrequency: z.enum(billingFrequencyEnum.enumValues),
    payCurrency: z.string(),
    billingRate: z.number().positive().optional(),
    billingFrequency: z.enum(billingFrequencyEnum.enumValues).optional(),
    billingCurrency: z.string().optional(),
    effectiveFrom: z.string().min(1, 'Effective date is required'),
  })
  .transform((data) => ({
    ...data,
    billingRate: data.billingRate ?? data.payRate,
    billingFrequency: data.billingFrequency ?? data.payFrequency,
    billingCurrency: data.billingCurrency ?? data.payCurrency,
  }))

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
  // Amounts are stored in minor units (cents).
  payRate: z.number().optional(),
  payCurrency: z.string().min(1, 'Currency is required'),
  payFrequency: z.enum(billingFrequencyEnum.enumValues),
  // Optional — falls back to the pay values when left blank.
  billingRate: z.number().optional(),
  billingCurrency: z.string().min(1, 'Currency is required'),
  billingFrequency: z.enum(billingFrequencyEnum.enumValues),
  effectiveFrom: z.string().min(1, 'Effective date is required'),
  isProjectSpecific: z.boolean(),
})

export const projectBudgetFormSchema = z.object({
  budgetHours: z.string().min(1, 'Budget is required'),
  alertThreshold: z.number().int().min(1).max(100),
})

export type ProjectBudgetFormValues = z.infer<typeof projectBudgetFormSchema>
export type MemberRateFormValues = z.infer<typeof memberRateFormSchema>
