'use client'

import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export interface LineItem {
  amount: string
  description: string
  quantity: string
  title?: string
  unitPrice: string
}

interface LineItemsEditorProps {
  currency: string
  editable: boolean
  items: LineItem[]
  onChange: (items: LineItem[]) => void
  title?: string
}

export default function LineItemsEditor({
  items,
  onChange,
  currency,
  editable,
  title,
}: LineItemsEditorProps) {
  const updateItem = (index: number, field: keyof LineItem, value: string) => {
    const updated = [...items]
    //@ts-expect-error - we know the index is valid
    updated[index] = { ...updated[index], [field]: value }

    if (field === 'quantity' || field === 'unitPrice') {
      const qty = Number(updated[index]!.quantity) || 0
      const price = Number(updated[index]!.unitPrice) || 0
      updated[index]!.amount = (qty * price).toFixed(2)
    }

    onChange(updated)
  }

  const addItem = () => {
    onChange([
      ...items,
      {
        title: '',
        description: '',
        quantity: '1',
        unitPrice: '0',
        amount: '0',
      },
    ])
  }

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index))
  }

  const total = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)

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
              {items.map((item, index) => (
                <tr className='border-b last:border-b-0' key={index}>
                  <td className='px-3 py-2'>
                    {editable ? (
                      <Input
                        className='h-8 border-none shadow-none focus-visible:ring-0'
                        onChange={(e) => {
                          updateItem(index, 'description', e.target.value)
                          updateItem(index, 'title', e.target.value)
                        }}
                        placeholder='Item description'
                        value={item.description ?? item.title}
                      />
                    ) : (
                      <span>{item.description}</span>
                    )}
                  </td>
                  <td className='px-3 py-2 text-right'>
                    {editable ? (
                      <Input
                        className='h-8 border-none text-right shadow-none focus-visible:ring-0'
                        onChange={(e) =>
                          updateItem(index, 'quantity', e.target.value)
                        }
                        value={item.quantity}
                      />
                    ) : (
                      <span>{item.quantity}</span>
                    )}
                  </td>
                  <td className='px-3 py-2 text-right'>
                    {editable ? (
                      <Input
                        className='h-8 border-none text-right shadow-none focus-visible:ring-0'
                        onChange={(e) =>
                          updateItem(index, 'unitPrice', e.target.value)
                        }
                        value={item.unitPrice}
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
                        onClick={() => removeItem(index)}
                        size='sm'
                        variant='ghost'
                      >
                        <Trash2 className='size-3.5' />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className='bg-muted/30'>
                <td
                  className='px-3 py-2 text-right font-semibold'
                  colSpan={editable ? 3 : 3}
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
