import { timesheetService } from '@/app/api/timesheets/service'
import { computeEntryAmount } from '@/lib/billing'
import { currencyConversionService } from '@/services/currency-conversion.service'
import { memberRateKey } from '../common'
import type { BillableTimeEntry, MemberRateMapEntry } from '../types'

interface BuildRateMapArgs {
  baseCurrency: string
  billableEntries: BillableTimeEntry[]
  isMemberInvoice: boolean
  projectId: string
}

// Resolves per-entry member rates and converts each to the invoice's
// currency. Distinct (memberId, workDate) lookups are batched in parallel so
// invoices with many entries don't pay an N×roundtrip cost.
export async function buildMemberRateMap({
  billableEntries,
  projectId,
  isMemberInvoice,
  baseCurrency,
}: BuildRateMapArgs): Promise<Record<string, MemberRateMapEntry>> {
  const uniqueKeys = new Map<string, { memberId: string; date: string }>()
  for (const entry of billableEntries) {
    const key = memberRateKey(entry.memberId, entry.date)
    if (!uniqueKeys.has(key)) {
      uniqueKeys.set(key, { memberId: entry.memberId, date: entry.date })
    }
  }

  const rateLookups = await Promise.all(
    [...uniqueKeys.entries()].map(async ([key, { memberId, date }]) => ({
      key,
      rate: await timesheetService.getMemberRate(
        memberId,
        projectId,
        new Date(date).toISOString()
      ),
    }))
  )

  const conversions = await Promise.all(
    rateLookups.map(async ({ key, rate }) => {
      if (!rate) {
        return { key, entry: null as MemberRateMapEntry | null }
      }

      // Member invoice → pay the person their pay rate.
      // Client invoice → charge billing rate (fallback to pay if unset).
      // Currency/frequency/rate must move together.
      const sourceRate =
        isMemberInvoice || rate.billingRate == null
          ? {
              rate: rate.payRate,
              currency: rate.payCurrency,
              frequency: rate.payFrequency ?? ('hourly' as const),
            }
          : {
              rate: rate.billingRate,
              currency: rate.billingCurrency,
              frequency: rate.billingFrequency ?? ('hourly' as const),
            }

      const sourceHourly = computeEntryAmount(
        60,
        sourceRate.rate,
        sourceRate.frequency
      )

      const { amount: convertedHourly, rate: rateUsed } =
        await currencyConversionService.convertCents(
          sourceHourly,
          sourceRate.currency,
          baseCurrency
        )

      const entry: MemberRateMapEntry = {
        hourlyRate: convertedHourly,
        currency: baseCurrency,
        originalHourlyRate: sourceHourly,
        originalCurrency: sourceRate.currency,
        rateUsed,
        pay: sourceRate,
      }
      return { key, entry }
    })
  )

  const map: Record<string, MemberRateMapEntry> = {}
  for (const { key, entry } of conversions) {
    if (entry) {
      map[key] = entry
    }
  }
  return map
}
