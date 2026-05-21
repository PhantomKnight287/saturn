/**
 * Conversion helpers shared by the two paths that turn billable time entries
 * into invoice line items: the manual `ImportTimeEntriesDialog` and the silent
 * `autoImportTime` effect in the invoice editor.
 *
 * The chosen unit only changes how a line *reads* — `amount` is always derived
 * from the exact duration, so invoice totals stay identical whether entries are
 * imported in hours or minutes. See docs/adr/0002-invoice-import-time-unit-amount-accuracy.md.
 */

export type InvoiceTimeUnit = 'hours' | 'minutes'

export interface TimeEntryLineAmountsInput {
  durationMinutes: number
  /** Member's hourly rate, in integer cents per hour. */
  hourlyRateCents: number
  unit: InvoiceTimeUnit
}

export interface TimeEntryLineAmounts {
  amount: string
  quantity: string
  unitPrice: string
}

/**
 * Computes the `{ quantity, unitPrice, amount }` strings for a line item.
 *
 * - `quantity` reflects the unit: hours → `1.50`, minutes → `90`.
 * - `unitPrice` is the per-unit rate: hours → rate/100 (2 dp), minutes →
 *   rate/100/60 (4 dp, the lossy per-minute rate).
 * - `amount` is always derived from the exact duration (rate/100 × hours,
 *   2 dp), independent of the rounded `unitPrice`, so totals never drift.
 */
export function timeEntryLineAmounts({
  durationMinutes,
  hourlyRateCents,
  unit,
}: TimeEntryLineAmountsInput): TimeEntryLineAmounts {
  const hours = durationMinutes / 60
  const ratePerHour = hourlyRateCents / 100
  const amount = (hours * ratePerHour).toFixed(2)

  if (unit === 'minutes') {
    return {
      quantity: String(durationMinutes),
      unitPrice: (ratePerHour / 60).toFixed(4),
      amount,
    }
  }

  return {
    quantity: hours.toFixed(2),
    unitPrice: ratePerHour.toFixed(2),
    amount,
  }
}

/**
 * Human-facing duration label in the chosen unit, e.g. `"1.5h"` or `"90m"`.
 * Used for line-item description suffixes and the dialog's "selected" badge.
 */
export function formatDurationInUnit(
  durationMinutes: number,
  unit: InvoiceTimeUnit
): string {
  if (unit === 'minutes') {
    return `${durationMinutes}m`
  }
  return `${Number((durationMinutes / 60).toFixed(2))}h`
}
