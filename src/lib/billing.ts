import type { billingFrequencyEnum } from '@/server/db/schema'

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
