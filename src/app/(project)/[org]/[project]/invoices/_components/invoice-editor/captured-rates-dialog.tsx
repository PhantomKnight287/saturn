'use client'

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
import type { CapturedConversionRate } from '../../types'

interface CapturedRatesDialogProps {
  onOpenChange: (open: boolean) => void
  open: boolean
  rates: CapturedConversionRate[]
}

// Trims trailing zeros while preserving enough precision for currencies
// that move in tiny fractions (e.g. USD → IDR inverse).
function formatRate(value: string): string {
  const n = Number(value)
  if (!Number.isFinite(n)) {
    return value
  }
  if (n === 0) {
    return '0'
  }
  // Show up to 8 significant figures, then strip trailing zeros.
  return Number.parseFloat(n.toPrecision(8)).toString()
}

export function CapturedRatesDialog({
  open,
  onOpenChange,
  rates,
}: CapturedRatesDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>Captured conversion rates</DialogTitle>
          <DialogDescription>
            The exact FX rates used when this invoice was created — kept for
            audit and dispute resolution.
          </DialogDescription>
        </DialogHeader>

        {rates.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No conversions recorded</EmptyTitle>
              <EmptyDescription>
                Every line on this invoice was already in the invoice currency,
                so no conversion rates were captured.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className='max-h-[60vh] space-y-2 overflow-y-auto'>
            {rates.map((r) => {
              const captured = new Date(r.capturedAt)
              const rateNum = Number(r.rate)
              const inverse =
                Number.isFinite(rateNum) && rateNum > 0
                  ? formatRate((1 / rateNum).toString())
                  : null
              return (
                <div
                  className='space-y-1 rounded-lg border p-3 text-sm'
                  key={`${r.fromCurrency}->${r.toCurrency}`}
                >
                  <div className='font-medium'>
                    1 {r.fromCurrency} = {formatRate(r.rate)} {r.toCurrency}
                  </div>
                  {inverse && (
                    <div className='text-muted-foreground text-xs'>
                      1 {r.toCurrency} = {inverse} {r.fromCurrency}
                    </div>
                  )}
                  <div className='text-muted-foreground text-xs'>
                    Captured{' '}
                    {captured.toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
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
