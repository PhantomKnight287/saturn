import { X } from 'lucide-react'
import { memo } from 'react'
import type { Control, UseFormSetValue } from 'react-hook-form'
import { Controller } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { InvoiceFormValues } from '../../types'

export const InvoiceItemRow = memo(function InvoiceItemRow({
  control,
  index,
  isEditable,
  canRemove,
  onRemove,
  setValue,
}: {
  control: Control<InvoiceFormValues>
  index: number
  isEditable: boolean
  canRemove: boolean
  onRemove: () => void
  setValue: UseFormSetValue<InvoiceFormValues>
}) {
  return (
    <div className='grid grid-cols-[1fr_80px_110px_110px_32px] items-start gap-2'>
      <Controller
        control={control}
        name={`items.${index}.description`}
        render={({ field }) => (
          <Input {...field} placeholder='Description' readOnly={!isEditable} />
        )}
      />
      <Controller
        control={control}
        name={`items.${index}.quantity`}
        render={({ field }) => (
          <Input
            type='number'
            {...field}
            min='0'
            onChange={(e) => {
              field.onChange(e)
              const qty = Number(e.target.value || 0)
              const price = Number(
                control._formValues.items[index]?.unitPrice || 0
              )
              setValue(`items.${index}.amount`, (qty * price).toFixed(4))
            }}
            readOnly={!isEditable}
            step='0.0001'
          />
        )}
      />
      <Controller
        control={control}
        name={`items.${index}.unitPrice`}
        render={({ field }) => (
          <Input
            type='number'
            {...field}
            min='0'
            onChange={(e) => {
              field.onChange(e)
              const price = Number(e.target.value || 0)
              const qty = Number(
                control._formValues.items[index]?.quantity || 0
              )
              setValue(`items.${index}.amount`, (qty * price).toFixed(4))
            }}
            readOnly={!isEditable}
            step='0.0001'
          />
        )}
      />
      <Controller
        control={control}
        name={`items.${index}.amount`}
        render={({ field }) => (
          <Input {...field} className='bg-muted/50' readOnly />
        )}
      />
      {isEditable && canRemove ? (
        <Button
          className='size-9 text-muted-foreground hover:text-destructive'
          onClick={onRemove}
          size='icon'
          variant='ghost'
        >
          <X className='size-4' />
        </Button>
      ) : (
        <div className='size-9' />
      )}
    </div>
  )
})
