import { describe, expect, it } from 'vitest'
import {
  formatDurationInUnit,
  timeEntryLineAmounts,
} from './invoice-time-units'

describe('timeEntryLineAmounts', () => {
  it('renders hours with 2dp quantity and per-hour unitPrice', () => {
    const r = timeEntryLineAmounts({
      durationMinutes: 90,
      hourlyRateCents: 10_000, // $100/hr
      unit: 'hours',
    })
    expect(r).toEqual({
      quantity: '1.50',
      unitPrice: '100.00',
      amount: '150.00',
    })
  })

  it('renders minutes with integer quantity and 4dp per-minute unitPrice', () => {
    const r = timeEntryLineAmounts({
      durationMinutes: 90,
      hourlyRateCents: 10_000,
      unit: 'minutes',
    })
    expect(r).toEqual({ quantity: '90', unitPrice: '1.6667', amount: '150.00' })
  })

  it('amount stays identical across units (CONTEXT.md: Import amount accuracy)', () => {
    const inputs = { durationMinutes: 37, hourlyRateCents: 12_345 }
    const hours = timeEntryLineAmounts({ ...inputs, unit: 'hours' })
    const minutes = timeEntryLineAmounts({ ...inputs, unit: 'minutes' })
    expect(hours.amount).toBe(minutes.amount)
  })

  it('handles zero duration', () => {
    expect(
      timeEntryLineAmounts({
        durationMinutes: 0,
        hourlyRateCents: 10_000,
        unit: 'hours',
      })
    ).toEqual({ quantity: '0.00', unitPrice: '100.00', amount: '0.00' })
  })
})

describe('formatDurationInUnit', () => {
  it('formats minutes', () => {
    expect(formatDurationInUnit(90, 'minutes')).toBe('90m')
  })
  it('formats hours stripping trailing zeros', () => {
    expect(formatDurationInUnit(90, 'hours')).toBe('1.5h')
    expect(formatDurationInUnit(60, 'hours')).toBe('1h')
  })
})
