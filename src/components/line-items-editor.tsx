'use client'

import { Plus, Trash2 } from 'lucide-react'
import { memo, useCallback, useId, useMemo, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export interface LineItem {
  amount: string
  description: string
  quantity: string
  title?: string
  unitPrice: string
}

interface InternalLineItem extends LineItem {
  _rid: string
}

interface LineItemsEditorProps {
  currency: string
  editable: boolean
  items: LineItem[]
  onChange: (items: LineItem[]) => void
  title?: string
}

const calcAmount = (quantity: string, unitPrice: string) => {
  const qty = Number(quantity) || 0
  const price = Number(unitPrice) || 0
  return (qty * price).toFixed(2)
}

export default function LineItemsEditor({
  items,
  onChange,
  currency,
  editable,
  title,
}: LineItemsEditorProps) {
  const idPrefix = useId()
  const ridsRef = useRef<string[]>([])
  if (ridsRef.current.length !== items.length) {
    ridsRef.current = items.map(
      (_, i) => ridsRef.current[i] ?? `${idPrefix}-${i}-${Math.random()}`
    )
  }

  const internalItems: InternalLineItem[] = useMemo(
    () => items.map((it, i) => ({ ...it, _rid: ridsRef.current[i]! })),
    [items]
  )

  const itemsRef = useRef(items)
  itemsRef.current = items

  const updateItem = useCallback(
    (index: number, patch: Partial<LineItem>) => {
      const current = itemsRef.current
      const next = current.slice()
      const merged = { ...current[index]!, ...patch }
      if ('quantity' in patch || 'unitPrice' in patch) {
        merged.amount = calcAmount(merged.quantity, merged.unitPrice)
      }
      next[index] = merged
      onChange(next)
    },
    [onChange]
  )

  const removeItem = useCallback(
    (index: number) => {
      ridsRef.current = ridsRef.current.filter((_, i) => i !== index)
      onChange(itemsRef.current.filter((_, i) => i !== index))
    },
    [onChange]
  )

  const addItem = useCallback(() => {
    ridsRef.current = [
      ...ridsRef.current,
      `${idPrefix}-${ridsRef.current.length}-${Math.random()}`,
    ]
    onChange([
      ...itemsRef.current,
      {
        title: '',
        description: '',
        quantity: '1',
        unitPrice: '0',
        amount: '0',
      },
    ])
  }, [idPrefix, onChange])

  const total = useMemo(
    () => items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0),
    [items]
  )

  return (
    <div className='space-y-3'>
      <div className='flex items-center justify-between'>
        <h3 className='font-medium text-sm'>{title || 'Line Items'}</h3>
        {editable && (
          <Button onClick={addItem} size='sm' type='button' variant='outline'>
            <Plus className='size-3.5' />
            Add Item
          </Button>
        )}
      </div>

      {items.length > 0 && (
        <div className='overflow-x-auto rounded-md border'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b bg-muted/50'>
                <th className='px-3 py-2 text-left font-medium'>Description</th>
                <th className='w-24 px-3 py-2 text-right font-medium'>Qty</th>
                <th className='w-32 px-3 py-2 text-right font-medium'>
                  Unit Price
                </th>
                <th className='w-32 px-3 py-2 text-right font-medium'>
                  Amount
                </th>
                {editable && <th className='w-10 px-3 py-2' />}
              </tr>
            </thead>
            <tbody>
              {internalItems.map((item, index) => (
                <LineItemRow
                  editable={editable}
                  index={index}
                  item={item}
                  key={item._rid}
                  onRemove={removeItem}
                  onUpdate={updateItem}
                />
              ))}
            </tbody>
            <tfoot>
              <tr className='bg-muted/30'>
                <td
                  className='px-3 py-2 text-right font-semibold'
                  colSpan={3}
                >
                  Total ({currency})
                </td>
                <td className='px-3 py-2 text-right font-semibold'>
                  {total.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
                {editable && <td />}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}

interface LineItemRowProps {
  editable: boolean
  index: number
  item: InternalLineItem
  onRemove: (index: number) => void
  onUpdate: (index: number, patch: Partial<LineItem>) => void
}

const LineItemRow = memo(function LineItemRow({
  editable,
  index,
  item,
  onRemove,
  onUpdate,
}: LineItemRowProps) {
  return (
    <tr className='border-b last:border-b-0'>
      <td className='px-3 py-2'>
        {editable ? (
          <Input
            className='h-8 border-none shadow-none focus-visible:ring-0'
            defaultValue={item.description ?? item.title ?? ''}
            onBlur={(e) => {
              const value = e.target.value
              if (value !== (item.description ?? item.title ?? '')) {
                onUpdate(index, { description: value, title: value })
              }
            }}
            placeholder='Item description'
          />
        ) : (
          <span>{item.description}</span>
        )}
      </td>
      <td className='px-3 py-2 text-right'>
        {editable ? (
          <Input
            className='h-8 border-none text-right shadow-none focus-visible:ring-0'
            defaultValue={item.quantity}
            onBlur={(e) => {
              if (e.target.value !== item.quantity) {
                onUpdate(index, { quantity: e.target.value })
              }
            }}
          />
        ) : (
          <span>{item.quantity}</span>
        )}
      </td>
      <td className='px-3 py-2 text-right'>
        {editable ? (
          <Input
            className='h-8 border-none text-right shadow-none focus-visible:ring-0'
            defaultValue={item.unitPrice}
            onBlur={(e) => {
              if (e.target.value !== item.unitPrice) {
                onUpdate(index, { unitPrice: e.target.value })
              }
            }}
          />
        ) : (
          <span>{item.unitPrice}</span>
        )}
      </td>
      <td className='px-3 py-2 text-right font-medium'>
        {Number(item.amount).toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </td>
      {editable && (
        <td className='px-2 py-2'>
          <Button
            className='h-7 w-7 p-0 text-muted-foreground hover:text-destructive'
            onClick={() => onRemove(index)}
            size='sm'
            variant='ghost'
          >
            <Trash2 className='size-3.5' />
          </Button>
        </td>
      )}
    </tr>
  )
})
