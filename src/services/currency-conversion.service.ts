import { sql } from 'drizzle-orm'
import type { DbOrTx } from '@/server/db'
import { redis } from '@/server/db/redis'
import { invoiceConversionRates } from '@/server/db/schema'

const RATES_KEY = 'rates:latest'
const BASE_URL = 'https://latest.currency-api.pages.dev/v1/currencies/usd.json'
const TTL_SECONDS = 4 * 60 * 60
const FETCH_TIMEOUT_MS = 10_000

export class CurrencyConversionError extends Error {
  readonly from: string
  readonly to: string

  constructor(from: string, to: string, message: string) {
    super(message)
    this.name = 'CurrencyConversionError'
    this.from = from
    this.to = to
  }
}

// Result of a conversion — carries the rate so the caller can persist it
// alongside the converted amount for audit/dispute resolution.
export interface ConvertedAmount {
  amount: number
  // Multiplier such that `targetAmount = sourceAmount * rate`.
  rate: number
}

// Coalesces concurrent cold-cache fetches into one upstream call so a burst
// of requests doesn't trigger N parallel API hits.
let inFlightFetch: Promise<void> | null = null

export const currencyConversionService = {
  async fetchConversionRates(): Promise<void> {
    if ((await redis.exists(RATES_KEY)) === 1) {
      return
    }
    if (inFlightFetch) {
      await inFlightFetch
      return
    }
    inFlightFetch = (async () => {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
      try {
        const response = await fetch(BASE_URL, { signal: controller.signal })
        if (!response.ok) {
          throw new Error(
            `Upstream rates fetch failed: ${response.status} ${response.statusText}`
          )
        }
        const data = (await response.json()) as {
          date: string
          usd: Record<string, number>
        }
        if (!data.usd) {
          throw new Error('No exchange rates returned from upstream')
        }
        await redis.hset(RATES_KEY, data.usd)
        await redis.expire(RATES_KEY, TTL_SECONDS)
      } finally {
        clearTimeout(timer)
      }
    })()
    try {
      await inFlightFetch
    } finally {
      inFlightFetch = null
    }
  },

  async getConversionRates(): Promise<Record<string, number>> {
    await this.fetchConversionRates()
    const raw = await redis.hgetall(RATES_KEY)
    const rates: Record<string, number> = {}
    for (const [currency, value] of Object.entries(raw)) {
      const n = Number(value)
      if (Number.isFinite(n)) {
        rates[currency.toLowerCase()] = n
      }
    }
    return rates
  },

  async getRate(currency: string): Promise<number | null> {
    await this.fetchConversionRates()
    const value = await redis.hget(RATES_KEY, currency.toLowerCase())
    if (value == null) {
      return null
    }
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  },

  // Resolves the rate multiplier from `from` to `to`. Throws if either
  // currency is unknown to the provider — callers should not silently
  // coerce a missing rate, since that would misprice the line.
  async getConversionRate(from: string, to: string): Promise<number> {
    const fromCode = from.toLowerCase()
    const toCode = to.toLowerCase()
    if (fromCode === toCode) {
      return 1
    }
    const [fromRate, toRate] = await Promise.all([
      fromCode === 'usd' ? 1 : this.getRate(fromCode),
      toCode === 'usd' ? 1 : this.getRate(toCode),
    ])
    if (fromRate == null) {
      throw new CurrencyConversionError(
        from,
        to,
        `No exchange rate available for ${from.toUpperCase()}`
      )
    }
    if (toRate == null) {
      throw new CurrencyConversionError(
        from,
        to,
        `No exchange rate available for ${to.toUpperCase()}`
      )
    }
    if (fromRate === 0) {
      throw new CurrencyConversionError(
        from,
        to,
        `Invalid exchange rate (zero) for ${from.toUpperCase()}`
      )
    }
    return toRate / fromRate
  },

  async convert(
    amount: number,
    from: string,
    to: string
  ): Promise<ConvertedAmount> {
    const rate = await this.getConversionRate(from, to)
    return { amount: amount * rate, rate }
  },

  // Same as `convert` but rounds the amount — useful when the input is in
  // minor units (cents) and the result must stay an integer.
  async convertCents(
    amountCents: number,
    from: string,
    to: string
  ): Promise<ConvertedAmount> {
    const { amount, rate } = await this.convert(amountCents, from, to)
    return { amount: Math.round(amount), rate }
  },

  // Persist the rates used to convert each source currency into the invoice
  // currency. `rates` carries the actual rate that priced the line items;
  // re-fetching here would risk capturing a different value than what was
  // applied. Updates existing rows so an invoice update re-records the
  // current rate rather than retaining a stale snapshot.
  async snapshotRates(
    tx: DbOrTx,
    invoiceId: string,
    rates: Map<string, number>,
    targetCurrency: string
  ): Promise<void> {
    const target = targetCurrency.toUpperCase()
    const rows: (typeof invoiceConversionRates.$inferInsert)[] = []
    for (const [fromCurrency, rate] of rates.entries()) {
      const from = fromCurrency.toUpperCase()
      if (from === target) {
        continue
      }
      rows.push({
        invoiceId,
        fromCurrency: from,
        toCurrency: target,
        rate: rate.toString(),
      })
    }
    if (rows.length === 0) {
      return
    }
    await tx
      .insert(invoiceConversionRates)
      .values(rows)
      .onConflictDoUpdate({
        target: [
          invoiceConversionRates.invoiceId,
          invoiceConversionRates.fromCurrency,
          invoiceConversionRates.toCurrency,
        ],
        set: {
          rate: sql`excluded.rate`,
          capturedAt: sql`excluded.captured_at`,
        },
      })
  },
}
