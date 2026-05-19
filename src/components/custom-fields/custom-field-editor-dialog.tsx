'use client'

import { Plus, X } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import DatePicker from '@/components/ui/date-picker'
import { DateTimePicker } from '@/components/ui/datetime-picker'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TimePicker } from '@/components/ui/time-picker'
import {
  CUSTOM_FIELD_TYPE_LABELS,
  CUSTOM_FIELD_TYPES,
  type CustomFieldFormValues,
  type CustomFieldInitial,
  type CustomFieldSubmitPayload,
  type CustomFieldType,
  isTemporalType,
  parseDateOnlyAsLocal,
  toCustomFieldFormValues,
  toSubmittableCustomFieldPayload,
} from '@/lib/custom-fields'

export function CustomFieldEditorDialog({
  open,
  onOpenChange,
  mode,
  initial,
  isPending,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  initial?: CustomFieldInitial
  isPending: boolean
  onSubmit: (payload: CustomFieldSubmitPayload) => void | Promise<void>
}) {
  const defaultValues = useMemo(
    () => toCustomFieldFormValues(initial),
    [initial]
  )

  const form = useForm<CustomFieldFormValues>({
    defaultValues,
    mode: 'onSubmit',
  })

  useEffect(() => {
    if (open) {
      form.reset(defaultValues)
    }
  }, [open, defaultValues, form])

  const type = form.watch('type')
  const useCurrent = form.watch('useCurrent')

  const optionsArray = useFieldArray({
    control: form.control,
    name: 'options' as never,
  })

  const handleSubmit = form.handleSubmit((values) => {
    const payload = toSubmittableCustomFieldPayload(values)
    if (!payload.label) {
      form.setError('label', { message: 'Label is required.' })
      return
    }
    if (payload.type === 'select' && payload.options?.length === 0) {
      form.setError('options' as never, {
        message: 'At least one option is required.',
      })
      return
    }
    return onSubmit(payload)
  })

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className='sm:max-w-[520px]'>
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Add field' : 'Edit field'}
          </DialogTitle>
          <DialogDescription>
            Configure how this field appears on the timesheet form.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Controller
              control={form.control}
              name='label'
              render={({ field, fieldState }) => (
                <Field className='gap-1' data-invalid={fieldState.invalid}>
                  <FieldLabel>Label</FieldLabel>
                  <Input {...field} autoFocus placeholder='e.g. Ticket ID' />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name='type'
              render={({ field }) => (
                <Field className='gap-1'>
                  <FieldLabel>Type</FieldLabel>
                  <Select
                    disabled={mode === 'edit'}
                    onValueChange={(v) => {
                      field.onChange(v)
                      form.setValue('defaultValue', null)
                      form.setValue('useCurrent', false)
                      form.setValue('options', [])
                    }}
                    value={field.value}
                  >
                    <SelectTrigger className='w-full'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CUSTOM_FIELD_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {CUSTOM_FIELD_TYPE_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {mode === 'edit' && (
                    <FieldDescription>
                      Type can't be changed after creation. Delete and recreate.
                    </FieldDescription>
                  )}
                </Field>
              )}
            />

            {type === 'select' && (
              <Field className='gap-1'>
                <FieldLabel>Options</FieldLabel>
                <div className='space-y-2'>
                  {optionsArray.fields.map((f, idx) => (
                    <div className='flex gap-2' key={f.id}>
                      <Input
                        {...form.register(`options.${idx}.value` as const)}
                        placeholder={`Option ${idx + 1}`}
                      />
                      <Button
                        aria-label={`Remove option ${idx + 1}`}
                        onClick={() => optionsArray.remove(idx)}
                        size='icon'
                        type='button'
                        variant='ghost'
                      >
                        <X className='size-4' />
                      </Button>
                    </div>
                  ))}
                  <Button
                    onClick={() => optionsArray.append({ value: '' })}
                    size='sm'
                    type='button'
                    variant='outline'
                  >
                    <Plus className='size-4' />
                    Add option
                  </Button>
                </div>
                {form.formState.errors.options && (
                  <FieldError
                    errors={[
                      {
                        message:
                          (
                            form.formState.errors.options as {
                              message?: string
                            }
                          ).message ?? 'Invalid options',
                      },
                    ]}
                  />
                )}
              </Field>
            )}

            {type === 'number' && (
              <div className='grid grid-cols-2 gap-3'>
                <Field className='gap-1'>
                  <FieldLabel>Min</FieldLabel>
                  <Controller
                    control={form.control}
                    name='config.min'
                    render={({ field }) => (
                      <Input
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === ''
                              ? undefined
                              : Number(e.target.value)
                          )
                        }
                        type='number'
                        value={field.value ?? ''}
                      />
                    )}
                  />
                </Field>
                <Field className='gap-1'>
                  <FieldLabel>Max</FieldLabel>
                  <Controller
                    control={form.control}
                    name='config.max'
                    render={({ field }) => (
                      <Input
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === ''
                              ? undefined
                              : Number(e.target.value)
                          )
                        }
                        type='number'
                        value={field.value ?? ''}
                      />
                    )}
                  />
                </Field>
              </div>
            )}

            {type === 'text' && (
              <Field className='gap-1'>
                <FieldLabel>Max length</FieldLabel>
                <Controller
                  control={form.control}
                  name='config.maxLength'
                  render={({ field }) => (
                    <Input
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === ''
                            ? undefined
                            : Number(e.target.value)
                        )
                      }
                      placeholder='500'
                      type='number'
                      value={field.value ?? ''}
                    />
                  )}
                />
              </Field>
            )}

            {isTemporalType(type) && (
              <Field
                className='flex-row items-center gap-2'
                orientation='horizontal'
              >
                <Controller
                  control={form.control}
                  name='useCurrent'
                  render={({ field }) => (
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(v) => field.onChange(Boolean(v))}
                    />
                  )}
                />
                <FieldLabel className='font-normal'>
                  Use current ({type === 'date' ? 'today' : 'now'}) as default
                </FieldLabel>
              </Field>
            )}

            {!useCurrent && type !== 'checkbox' && (
              <Field className='gap-1'>
                <FieldLabel>Default</FieldLabel>
                <DefaultInput
                  control={form.control}
                  options={form.watch('options') ?? []}
                  type={type}
                />
                <FieldDescription>
                  Optional. Pre-fills the field when a new entry is created.
                </FieldDescription>
              </Field>
            )}

            {type === 'checkbox' && (
              <Field
                className='flex-row items-center gap-2'
                orientation='horizontal'
              >
                <Controller
                  control={form.control}
                  name='defaultValue'
                  render={({ field }) => (
                    <Checkbox
                      checked={field.value === 'true'}
                      onCheckedChange={(v) =>
                        field.onChange(v ? 'true' : 'false')
                      }
                    />
                  )}
                />
                <FieldLabel className='font-normal'>
                  Default to checked
                </FieldLabel>
              </Field>
            )}

            <div className='flex flex-col gap-2 pt-1'>
              <Field
                className='flex-row items-center gap-2'
                orientation='horizontal'
              >
                <Controller
                  control={form.control}
                  name='required'
                  render={({ field }) => (
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(v) => field.onChange(Boolean(v))}
                    />
                  )}
                />
                <FieldLabel className='font-normal'>Required</FieldLabel>
              </Field>
              <Field
                className='flex-row items-center gap-2'
                orientation='horizontal'
              >
                <Controller
                  control={form.control}
                  name='visibleToClient'
                  render={({ field }) => (
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(v) => field.onChange(Boolean(v))}
                    />
                  )}
                />
                <FieldLabel className='font-normal'>
                  Visible to client
                </FieldLabel>
              </Field>
            </div>
          </FieldGroup>

          <DialogFooter className='mt-6'>
            <Button
              onClick={() => onOpenChange(false)}
              type='button'
              variant='outline'
            >
              Cancel
            </Button>
            <Button loading={isPending} type='submit'>
              {mode === 'create' ? 'Add field' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DefaultInput({
  type,
  control,
  options,
}: {
  type: CustomFieldType
  control: ReturnType<typeof useForm<CustomFieldFormValues>>['control']
  options: { value: string }[]
}) {
  if (type === 'select') {
    const validOptions = options.map((o) => o.value).filter(Boolean)
    return (
      <Controller
        control={control}
        name='defaultValue'
        render={({ field }) => (
          <Select
            onValueChange={(v) => field.onChange(v === '__none__' ? null : v)}
            value={field.value ?? '__none__'}
          >
            <SelectTrigger className='w-full'>
              <SelectValue placeholder='(none)' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='__none__'>(none)</SelectItem>
              {validOptions.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
    )
  }

  if (type === 'date') {
    return (
      <Controller
        control={control}
        name='defaultValue'
        render={({ field }) => (
          <DatePicker
            disablePastDates={false}
            onChange={(d) => {
              if (!d) {
                field.onChange(null)
                return
              }
              const y = d.getFullYear()
              const m = String(d.getMonth() + 1).padStart(2, '0')
              const day = String(d.getDate()).padStart(2, '0')
              field.onChange(`${y}-${m}-${day}`)
            }}
            value={
              field.value
                ? (parseDateOnlyAsLocal(field.value) ?? undefined)
                : undefined
            }
          />
        )}
      />
    )
  }

  if (type === 'time') {
    return (
      <Controller
        control={control}
        name='defaultValue'
        render={({ field }) => (
          <TimePicker onChange={field.onChange} value={field.value ?? null} />
        )}
      />
    )
  }

  if (type === 'datetime') {
    return (
      <Controller
        control={control}
        name='defaultValue'
        render={({ field }) => (
          <DateTimePicker
            onChange={field.onChange}
            value={field.value ?? null}
          />
        )}
      />
    )
  }

  if (type === 'number') {
    return (
      <Controller
        control={control}
        name='defaultValue'
        render={({ field }) => (
          <Input
            onChange={(e) =>
              field.onChange(e.target.value === '' ? null : e.target.value)
            }
            type='number'
            value={field.value ?? ''}
          />
        )}
      />
    )
  }

  return (
    <Controller
      control={control}
      name='defaultValue'
      render={({ field }) => (
        <Input
          onChange={(e) =>
            field.onChange(e.target.value === '' ? null : e.target.value)
          }
          value={field.value ?? ''}
        />
      )}
    />
  )
}
