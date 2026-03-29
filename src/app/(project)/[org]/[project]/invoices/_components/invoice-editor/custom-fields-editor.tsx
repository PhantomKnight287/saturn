import { Plus, X } from 'lucide-react'
import { memo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { CustomField } from '../../types'

export const CustomFieldsEditor = memo(function CustomFieldsEditor({
  fields,
  onChange,
  disabled,
}: {
  fields: CustomField[]
  onChange: (fields: CustomField[]) => void
  disabled?: boolean
}) {
  const updateField = (index: number, key: 'label' | 'value', val: string) => {
    const updated = [...fields]
    //@ts-expect-error
    updated[index] = { ...updated[index], [key]: val }
    onChange(updated)
  }
  const addField = () => onChange([...fields, { label: '', value: '' }])
  const removeField = (index: number) =>
    onChange(fields.filter((_, i) => i !== index))

  return (
    <div className='space-y-2'>
      {fields.map((f, i) => (
        <div className='flex items-center gap-2' key={i}>
          <Input
            className='w-32'
            onChange={(e) => updateField(i, 'label', e.target.value)}
            placeholder='Label'
            readOnly={disabled}
            value={f.label}
          />
          <Input
            className='flex-1'
            onChange={(e) => updateField(i, 'value', e.target.value)}
            placeholder='Value'
            readOnly={disabled}
            value={f.value}
          />
          {!disabled && (
            <Button
              className='size-8 shrink-0 text-muted-foreground hover:text-destructive'
              onClick={() => removeField(i)}
              size='icon'
              variant='ghost'
            >
              <X className='size-3.5' />
            </Button>
          )}
        </div>
      ))}
      {!disabled && (
        <Button
          className='text-muted-foreground text-xs'
          onClick={addField}
          size='sm'
          variant='ghost'
        >
          <Plus className='size-3' />
          Add Field
        </Button>
      )}
    </div>
  )
})
