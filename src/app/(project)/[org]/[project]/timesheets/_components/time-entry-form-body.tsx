'use client'

import { useRouter } from '@bprogress/next/app'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAction } from 'next-safe-action/hooks'
import { useEffect, useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import DatePicker from '@/components/ui/date-picker'
import { DateTimePicker } from '@/components/ui/datetime-picker'
import {
  Field,
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
import { Textarea } from '@/components/ui/textarea'
import { TimePicker } from '@/components/ui/time-picker'
import {
  type CustomFieldDefinition,
  parseDateOnlyAsLocal,
  resolveDefault,
} from '@/lib/custom-fields'
import { createTimeEntryAction, updateTimeEntryAction } from '../actions'
import { formatMinutes, timeEntryFormSchema } from '../common'
import type { Requirement, TimeEntry, TimeEntryFormValues } from '../types'

const HOURS_MINUTES_RE = /^(\d+)\s*h\s*(\d+)\s*m?$/
const HOURS_ONLY_RE = /^(\d+(?:\.\d+)?)\s*h$/
const MINUTES_ONLY_RE = /^(\d+)\s*m$/
const DECIMAL_HOURS_RE = /^(\d+(?:\.\d+)?)$/

export function parseDuration(input: string): number | null {
  const trimmed = input.trim().toLowerCase()
  const hm = trimmed.match(HOURS_MINUTES_RE)
  if (hm) {
    return Number(hm.at(1)) * 60 + Number(hm.at(2))
  }
  const hOnly = trimmed.match(HOURS_ONLY_RE)
  if (hOnly) {
    return Math.round(Number(hOnly.at(1)) * 60)
  }
  const mOnly = trimmed.match(MINUTES_ONLY_RE)
  if (mOnly) {
    return Number(mOnly.at(1))
  }
  const decimal = trimmed.match(DECIMAL_HOURS_RE)
  if (decimal) {
    return Math.round(Number(decimal.at(1)) * 60)
  }
  return null
}

export function toLocalDateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function TimeEntryFormBody({
  projectId,
  requirements,
  customFields,
  editEntry,
  defaultDate,
  defaultDurationMinutes,
  onCancel,
  onDone,
  submitLabel,
  redirectAfterSubmit,
}: {
  projectId: string
  requirements: Requirement[]
  customFields: CustomFieldDefinition[]
  editEntry?: TimeEntry
  defaultDate?: Date
  defaultDurationMinutes?: number
  onCancel?: () => void
  onDone?: () => void
  submitLabel?: string
  redirectAfterSubmit?: string
}) {
  const router = useRouter()
  const initialDate = editEntry
    ? new Date(editEntry.date)
    : (defaultDate ?? new Date())

  const initialCustomValues = useMemo<Record<string, unknown>>(() => {
    if (editEntry?.customValues) {
      return { ...(editEntry.customValues as Record<string, unknown>) }
    }
    const out: Record<string, unknown> = {}
    for (const def of customFields) {
      const v = resolveDefault(def)
      if (v != null) {
        out[def.id] = v
      }
    }
    return out
  }, [editEntry, customFields])

  const form = useForm<
    TimeEntryFormValues & { custom: Record<string, unknown> }
  >({
    resolver: zodResolver(timeEntryFormSchema) as never,
    defaultValues: {
      requirementId: editEntry?.requirementId ?? '',
      description: editEntry?.description ?? '',
      date: toLocalDateString(initialDate),
      durationInput: editEntry
        ? formatMinutes(editEntry.durationMinutes)
        : defaultDurationMinutes
          ? formatMinutes(defaultDurationMinutes)
          : '',
      billable: editEntry?.billable ?? true,
      custom: initialCustomValues,
    },
  })

  useEffect(() => {
    if (editEntry) {
      return
    }
    if (defaultDate) {
      form.setValue('date', toLocalDateString(defaultDate))
    }
    form.setValue(
      'durationInput',
      defaultDurationMinutes ? formatMinutes(defaultDurationMinutes) : ''
    )
  }, [defaultDate, defaultDurationMinutes, editEntry, form])

  const createAction = useAction(createTimeEntryAction, {
    onSuccess: () => {
      toast.success('Time entry created')
      onDone?.()
      if (redirectAfterSubmit) {
        // biome-ignore lint/suspicious/noExplicitAny: dynamic href not in typed routes
        router.push(redirectAfterSubmit as any)
        return
      }
      router.refresh()
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Failed to create time entry')
    },
  })

  const updateAction = useAction(updateTimeEntryAction, {
    onSuccess: () => {
      toast.success('Time entry updated')
      onDone?.()
      if (redirectAfterSubmit) {
        // biome-ignore lint/suspicious/noExplicitAny: dynamic href not in typed routes
        router.push(redirectAfterSubmit as any)
        return
      }
      router.refresh()
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Failed to update time entry')
    },
  })

  const isPending = createAction.isPending || updateAction.isPending

  function onSubmit(
    values: TimeEntryFormValues & { custom: Record<string, unknown> }
  ) {
    const minutes = parseDuration(values.durationInput)
    if (minutes === null || minutes <= 0) {
      toast.error('Invalid duration. Use formats like 1h30m, 1.5h, or 90m')
      return
    }

    // Read custom values directly: zodResolver(timeEntryFormSchema) strips
    // unknown keys, so `values.custom` is always undefined here.
    const customValues =
      (form.getValues('custom' as never) as
        | Record<string, unknown>
        | undefined) ?? {}

    for (const def of customFields) {
      const v = customValues[def.id]
      if (def.required && (v == null || v === '')) {
        toast.error(`${def.label} is required`)
        return
      }
    }

    if (editEntry) {
      updateAction.execute({
        timeEntryId: editEntry.id,
        requirementId: values.requirementId || null,
        description: values.description,
        date: values.date,
        durationMinutes: minutes,
        billable: values.billable,
        customValues,
      })
    } else {
      createAction.execute({
        projectId,
        requirementId: values.requirementId || undefined,
        description: values.description,
        date: values.date,
        durationMinutes: minutes,
        billable: values.billable,
        customValues,
      })
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <FieldGroup>
        <Controller
          control={form.control}
          name='requirementId'
          render={({ field, fieldState }) => (
            <Field
              className='col-span-full gap-1'
              data-invalid={fieldState.invalid}
            >
              <FieldLabel>Requirement</FieldLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger>
                  <SelectValue placeholder='Select a requirement' />
                </SelectTrigger>
                <SelectContent>
                  {requirements.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name='description'
          render={({ field, fieldState }) => (
            <Field
              className='col-span-full gap-1'
              data-invalid={fieldState.invalid}
            >
              <FieldLabel>Description</FieldLabel>
              <Textarea
                {...field}
                aria-invalid={fieldState.invalid}
                onChange={(e) => field.onChange(e.target.value)}
                placeholder='What did you work on?'
                rows={2}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <div className='grid grid-cols-2 gap-4'>
          <Controller
            control={form.control}
            name='date'
            render={({ field, fieldState }) => (
              <Field
                className='col-span-full gap-1'
                data-invalid={fieldState.invalid}
              >
                <FieldLabel>Date</FieldLabel>
                <DatePicker
                  disableFutureDates
                  disablePastDates={false}
                  onChange={(date) => {
                    field.onChange(date ? toLocalDateString(date) : '')
                  }}
                  value={field.value ? new Date(field.value) : undefined}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name='durationInput'
            render={({ field, fieldState }) => (
              <Field
                className='col-span-full gap-1'
                data-invalid={fieldState.invalid}
              >
                <FieldLabel>Duration</FieldLabel>
                <Input
                  {...field}
                  aria-invalid={fieldState.invalid}
                  onChange={(e) => field.onChange(e.target.value)}
                  placeholder='1h30m, 1.5h, or 90m'
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        </div>

        <Controller
          control={form.control}
          name='billable'
          render={({ field }) => (
            <Field className='gap-1' orientation='horizontal'>
              <Checkbox
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked === true)}
              />
              <FieldLabel className='cursor-pointer font-normal'>
                Billable
              </FieldLabel>
            </Field>
          )}
        />

        {customFields.length > 0 && (
          <div className='mt-4 rounded-lg border bg-muted/30 p-4'>
            <div className='mb-3 flex items-center gap-2'>
              <h3 className='font-semibold text-sm'>Custom fields</h3>
              <span className='text-muted-foreground text-xs'>
                Configured for this project
              </span>
            </div>
            <div className='space-y-4'>
              {customFields.map((def) => (
                <CustomFieldInput
                  // biome-ignore lint/suspicious/noExplicitAny: react-hook-form generic narrowing
                  control={form.control as any}
                  def={def}
                  key={def.id}
                />
              ))}
            </div>
          </div>
        )}
      </FieldGroup>

      <div className='mt-6 flex justify-end gap-2'>
        {onCancel && (
          <Button onClick={onCancel} type='button' variant='outline'>
            Cancel
          </Button>
        )}
        <Button
          disabled={isPending || editEntry?.status === 'admin_rejected'}
          loading={isPending}
          type='submit'
        >
          {submitLabel ?? (editEntry ? 'Update Entry' : 'Log Entry')}
        </Button>
      </div>
    </form>
  )
}

function CustomFieldInput({
  def,
  control,
}: {
  def: CustomFieldDefinition
  control: ReturnType<typeof useForm>['control']
}) {
  return (
    <Controller
      control={control}
      name={`custom.${def.id}` as never}
      render={({ field }) => {
        const value = field.value as unknown
        const label = (
          <FieldLabel className='gap-0'>
            {def.label}
            {def.required && <span className='text-destructive'>*</span>}
          </FieldLabel>
        )

        switch (def.type) {
          case 'text':
            return (
              <Field className='gap-1'>
                {label}
                <Input
                  maxLength={def.config?.maxLength ?? 500}
                  onChange={(e) => field.onChange(e.target.value)}
                  value={(value as string | undefined) ?? ''}
                />
              </Field>
            )
          case 'number':
            return (
              <Field className='gap-1'>
                {label}
                <Input
                  max={def.config?.max}
                  min={def.config?.min}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value === '' ? null : Number(e.target.value)
                    )
                  }
                  type='number'
                  value={
                    typeof value === 'number'
                      ? value
                      : value == null
                        ? ''
                        : String(value)
                  }
                />
              </Field>
            )
          case 'select':
            return (
              <Field className='gap-1'>
                {label}
                <Select
                  onValueChange={(v) =>
                    field.onChange(v === '__none__' ? null : v)
                  }
                  value={(value as string | undefined) ?? '__none__'}
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder='Select...' />
                  </SelectTrigger>
                  <SelectContent>
                    {!def.required && (
                      <SelectItem value='__none__'>(none)</SelectItem>
                    )}
                    {(def.options ?? []).map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )
          case 'checkbox':
            return (
              <Field className='gap-1' orientation='horizontal'>
                <Checkbox
                  checked={value === true}
                  onCheckedChange={(v) => field.onChange(v === true)}
                />
                <FieldLabel className='cursor-pointer font-normal'>
                  {def.label}
                </FieldLabel>
              </Field>
            )
          case 'date':
            return (
              <Field className='gap-1'>
                {label}
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
                    typeof value === 'string'
                      ? (parseDateOnlyAsLocal(value) ?? undefined)
                      : undefined
                  }
                />
              </Field>
            )
          case 'time':
            return (
              <Field className='gap-1'>
                {label}
                <TimePicker
                  onChange={field.onChange}
                  value={(value as string | null | undefined) ?? null}
                />
              </Field>
            )
          case 'datetime':
            return (
              <Field className='gap-1'>
                {label}
                <DateTimePicker
                  onChange={field.onChange}
                  value={(value as string | null | undefined) ?? null}
                />
              </Field>
            )
          default:
            return <span />
        }
      }}
    />
  )
}
