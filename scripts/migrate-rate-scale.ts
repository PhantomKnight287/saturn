/**
 * Data migration: normalise rate columns to THOUSANDTHS (3-decimal) precision
 * and backfill billing_* from pay_*.
 *
 * Why
 * ---
 * Rate columns (pay_rate / billing_rate on member_rates, pending_member_rates
 * and settings) are now stored in THOUSANDTHS of a currency unit (0.141 -> 141)
 * while computed money amounts stay in cents. Legacy data scale depends on the
 * UI that wrote it:
 *
 *   - settings & pending_member_rates were ONLY written by cents-based (x100)
 *     flows, so they are multiplied by 10 here to reach thousandths.
 *
 *   - member_rates is MIXED: the rates dialog already wrote thousandths (x1000)
 *     while the invite/add-member flow wrote cents (x100). The two cannot be
 *     told apart per row, so pay_rate is left UNSCALED (assumed thousandths).
 *     Pass --scale-member-rates if you KNOW every member_rates row came from a
 *     cents-based flow and needs x10.
 *
 * In every table, billing_* is backfilled from pay_* for rows where billing_rate
 * was never set (NULL), so billing mirrors pay by default.
 *
 * Usage
 * -----
 *   bun run scripts/migrate-rate-scale.ts                 # dry run (no writes)
 *   bun run scripts/migrate-rate-scale.ts --apply         # apply changes
 *   bun run scripts/migrate-rate-scale.ts --apply --scale-member-rates
 *
 * The script is NOT idempotent (scaling x10 twice double-scales). Run it exactly
 * once. Always take a backup first.
 */

import { eq } from 'drizzle-orm'
import { db } from '@/server/db'
import {
  memberRates,
  pendingMemberRates,
  settings as settingsTable,
} from '@/server/db/schema'

const APPLY = process.argv.includes('--apply')
const SCALE_MEMBER_RATES = process.argv.includes('--scale-member-rates')

type Freq = 'weekly' | 'biweekly' | 'monthly' | 'hourly'

/** Convert a cents value to thousandths. */
function centsToThousandths(cents: number): number {
  return cents * 10
}

let changeCount = 0

function logChange(table: string, id: string, before: object, after: object) {
  changeCount++
  console.log(
    `  [${table}] ${id}\n    before: ${JSON.stringify(before)}\n    after:  ${JSON.stringify(after)}`
  )
}

/**
 * settings + pending_member_rates: pay/billing are in CENTS -> scale to
 * thousandths, then backfill billing from pay where billing_rate is null.
 */
async function migrateCentsTable<
  T extends {
    id: string
    payRate: number | null
    payCurrency: string
    payFrequency: Freq | null
    billingRate: number | null
    billingCurrency: string
    billingFrequency: Freq | null
  },
>(
  label: string,
  rows: T[],
  update: (
    id: string,
    values: {
      payRate: number
      billingRate: number
      billingCurrency: string
      billingFrequency: Freq
    }
  ) => Promise<unknown>
) {
  console.log(`\n${label}: ${rows.length} row(s)`)
  for (const row of rows) {
    if (row.payRate == null) {
      console.log(`  [${label}] ${row.id} skipped (pay_rate is null)`)
      continue
    }

    const newPayRate = centsToThousandths(row.payRate)

    // Billing: scale if already set (cents), otherwise mirror the scaled pay.
    const billingSet = row.billingRate != null
    const newBillingRate = billingSet
      ? centsToThousandths(row.billingRate as number)
      : newPayRate
    const newBillingCurrency = billingSet ? row.billingCurrency : row.payCurrency
    const newBillingFrequency: Freq = billingSet
      ? (row.billingFrequency ?? 'hourly')
      : (row.payFrequency ?? 'hourly')

    logChange(
      label,
      row.id,
      {
        payRate: row.payRate,
        billingRate: row.billingRate,
        billingCurrency: row.billingCurrency,
        billingFrequency: row.billingFrequency,
      },
      {
        payRate: newPayRate,
        billingRate: newBillingRate,
        billingCurrency: newBillingCurrency,
        billingFrequency: newBillingFrequency,
      }
    )

    if (APPLY) {
      await update(row.id, {
        payRate: newPayRate,
        billingRate: newBillingRate,
        billingCurrency: newBillingCurrency,
        billingFrequency: newBillingFrequency,
      })
    }
  }
}

/**
 * member_rates: pay_rate assumed to already be in thousandths (unless
 * --scale-member-rates is given). Backfill billing from pay where unset.
 */
async function migrateMemberRates() {
  const rows = await db.select().from(memberRates)
  console.log(`\nmember_rates: ${rows.length} row(s)`)

  for (const row of rows) {
    const newPayRate = SCALE_MEMBER_RATES
      ? centsToThousandths(row.payRate)
      : row.payRate

    const billingSet = row.billingRate != null
    let newBillingRate: number
    if (billingSet) {
      newBillingRate = SCALE_MEMBER_RATES
        ? centsToThousandths(row.billingRate as number)
        : (row.billingRate as number)
    } else {
      newBillingRate = newPayRate
    }
    const newBillingCurrency = billingSet ? row.billingCurrency : row.payCurrency
    const newBillingFrequency: Freq = billingSet
      ? (row.billingFrequency ?? 'hourly')
      : (row.payFrequency ?? 'hourly')

    const payChanged = newPayRate !== row.payRate
    const billingChanged =
      newBillingRate !== row.billingRate ||
      newBillingCurrency !== row.billingCurrency ||
      newBillingFrequency !== row.billingFrequency

    if (!(payChanged || billingChanged)) {
      continue
    }

    logChange(
      'member_rates',
      row.id,
      {
        payRate: row.payRate,
        billingRate: row.billingRate,
        billingCurrency: row.billingCurrency,
        billingFrequency: row.billingFrequency,
      },
      {
        payRate: newPayRate,
        billingRate: newBillingRate,
        billingCurrency: newBillingCurrency,
        billingFrequency: newBillingFrequency,
      }
    )

    if (APPLY) {
      await db
        .update(memberRates)
        .set({
          payRate: newPayRate,
          billingRate: newBillingRate,
          billingCurrency: newBillingCurrency,
          billingFrequency: newBillingFrequency,
        })
        .where(eq(memberRates.id, row.id))
    }
  }
}

async function main() {
  console.log(
    `Rate scale migration — mode: ${APPLY ? 'APPLY (writing)' : 'DRY RUN (no writes)'}` +
      `${SCALE_MEMBER_RATES ? ', scaling member_rates x10' : ''}`
  )

  // settings (cents -> thousandths)
  const settingsRows = await db.select().from(settingsTable)
  await migrateCentsTable('settings', settingsRows, (id, values) =>
    db.update(settingsTable).set(values).where(eq(settingsTable.id, id))
  )

  // pending_member_rates (cents -> thousandths)
  const pendingRows = await db.select().from(pendingMemberRates)
  await migrateCentsTable('pending_member_rates', pendingRows, (id, values) =>
    db.update(pendingMemberRates).set(values).where(eq(pendingMemberRates.id, id))
  )

  // member_rates (thousandths assumed; backfill billing only by default)
  await migrateMemberRates()

  console.log(
    `\n${APPLY ? 'Applied' : 'Would apply'} ${changeCount} row update(s).`
  )
  if (!APPLY) {
    console.log('Re-run with --apply to write these changes.')
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Migration failed:', err)
    process.exit(1)
  })
