import { memo, useMemo } from 'react'
import type { Control } from 'react-hook-form'
import { useWatch } from 'react-hook-form'
import { currencies } from '@/data/currencies'
import type { InvoiceFormValues, InvoiceItem } from '../../types'

function formatDisplayAmount(amount: string) {
  const num = Number(amount)
  if (num % 1 === 0) {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  })
}

export const ItemsTotal = memo(function ItemsTotal({
  control,
}: {
  control: Control<InvoiceFormValues>
}) {
  const items = useWatch({
    control,
    name: 'items',
  }) as InvoiceFormValues['items']
  const currency = useWatch({ control, name: 'currency' })
  const discountAmount = useWatch({ control, name: 'discountAmount' })
  const discountLabel = useWatch({ control, name: 'discountLabel' })
  const currencySymbol = useMemo(
    () => currencies.find((c) => c.cc === currency)?.value ?? currency,
    [currency]
  )

  const subtotal = (items ?? [])
    .reduce(
      (sum: number, item: InvoiceItem) => sum + Number(item.amount || 0),
      0
    )
    .toFixed(4)

  const discount = Number(discountAmount || 0)
  const hasDiscount = discount > 0
  const grandTotal = (Number(subtotal) - discount).toFixed(4)

  return (
    <div className='flex justify-end border-t pt-3'>
      <div className='space-y-1 text-right'>
        {hasDiscount && (
          <>
            <div>
              <span className='text-muted-foreground text-sm'>Subtotal: </span>
              <span className='font-medium text-sm'>
                {currencySymbol} {formatDisplayAmount(subtotal)}
              </span>
            </div>
            <div>
              <span className='text-muted-foreground text-sm'>
                {discountLabel?.trim() || 'Discount'}:{' '}
              </span>
              <span className='font-medium text-green-600 text-sm'>
                -{currencySymbol} {formatDisplayAmount(discount.toFixed(4))}
              </span>
            </div>
          </>
        )}
        <div>
          <span className='text-muted-foreground text-sm'>Total: </span>
          <span className='font-semibold text-lg'>
            {currencySymbol}{' '}
            {formatDisplayAmount(hasDiscount ? grandTotal : subtotal)}
          </span>
        </div>
      </div>
    </div>
  )
})
