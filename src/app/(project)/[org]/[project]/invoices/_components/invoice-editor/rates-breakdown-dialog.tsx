'use client'

import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty'
import {
  FREQUENCY_LABELS,
  FREQUENCY_SHORTHAND,
} from '@/components/ui/rate-input'
import type { invoiceRecipientEnum } from '@/server/db/schema'
import { memberRateKey } from '../../common'
import type { BillableTimeEntry, MemberRateMapEntry } from '../../types'

interface RateBreakdownDialogProps {
  billableEntries: BillableTimeEntry[]
  memberRateMap: Record<string, MemberRateMapEntry>
  onOpenChange: (open: boolean) => void
  open: boolean
  recipientType: (typeof invoiceRecipientEnum.enumValues)[number]
}

function formatCents(cents: number): string {
  return (cents / 100).toFixed(2)
}

export function RateBreakdownDialog({
  open,
  onOpenChange,
  billableEntries,
  memberRateMap,
  recipientType,
}: RateBreakdownDialogProps) {
  const isClientInvoice = recipientType === 'client'
  const sourceBadgePrefix = isClientInvoice ? 'Billed' : 'Paid'
  const sourceRowLabel = isClientInvoice ? 'Billed at' : 'They are paid'
  const description = isClientInvoice
    ? "How each member's billing rate is converted into the invoice currency."
    : "How each member's pay is converted into the invoice currency."
  const rows = new Map<
    string,
    { memberName: string; rate: MemberRateMapEntry }
  >()
  for (const entry of billableEntries) {
    const key = memberRateKey(entry.memberId, entry.date)
    const rate = memberRateMap[key]
    if (!rate || rows.has(key)) {
      continue
    }
    rows.set(key, {
      memberName: entry.memberName ?? 'Team member',
      rate,
    })
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>Rate breakdown</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {rows.size === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No rates available</EmptyTitle>
              <EmptyDescription>
                No member rates have been configured for this project.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className='max-h-[60vh] space-y-3 overflow-y-auto'>
            {[...rows.entries()].map(([key, { memberName, rate }]) => {
              const sourceHourly = rate.originalHourlyRate ?? rate.hourlyRate
              const sourceCurrency = rate.originalCurrency ?? rate.currency
              const sameCurrency =
                sourceCurrency.toUpperCase() === rate.currency.toUpperCase()
              const conversionRate =
                sourceHourly > 0 ? rate.hourlyRate / sourceHourly : null

              return (
                <div className='space-y-2 rounded-lg border p-3' key={key}>
                  <div className='flex items-center justify-between'>
                    <span className='font-medium text-sm'>{memberName}</span>
                    {rate.pay && (
                      <Badge className='text-xs' variant='secondary'>
                        {sourceBadgePrefix} {rate.pay.currency}{' '}
                        {formatCents(rate.pay.rate)}
                        {FREQUENCY_SHORTHAND[rate.pay.frequency]}
                      </Badge>
                    )}
                  </div>

                  <div className='space-y-1 text-muted-foreground text-xs'>
                    {rate.pay && (
                      <div className='flex items-center justify-between'>
                        <span>{sourceRowLabel}</span>
                        <span>
                          {rate.pay.currency} {formatCents(rate.pay.rate)} (
                          {FREQUENCY_LABELS[rate.pay.frequency]})
                        </span>
                      </div>
                    )}
                    <div className='flex items-center justify-between'>
                      <span>Hourly equivalent</span>
                      <span>
                        {sourceCurrency} {formatCents(sourceHourly)}/h
                      </span>
                    </div>
                    <div className='flex items-center justify-between'>
                      <span>In invoice currency</span>
                      <span className='font-medium text-foreground'>
                        {rate.currency} {formatCents(rate.hourlyRate)}/h
                      </span>
                    </div>
                    {!sameCurrency && conversionRate != null && (
                      <div className='flex items-center justify-between border-t pt-1'>
                        <span>Conversion rate</span>
                        <span>
                          1 {sourceCurrency} = {conversionRate.toFixed(4)}{' '}
                          {rate.currency}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
