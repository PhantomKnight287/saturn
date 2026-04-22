/** biome-ignore-all lint/performance/useTopLevelRegex: I have no idea what this lint rule does tbh */
'use client'

import { useRouter } from '@bprogress/next/app'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAction } from 'next-safe-action/hooks'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import DatePicker from '@/components/ui/date-picker'
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
import { createTimeEntryAction, updateTimeEntryAction } from '../actions'
import { formatMinutes, timeEntryFormSchema } from '../common'
import type { Requirement, TimeEntry, TimeEntryFormValues } from '../types'

interface TimeEntryFormProps {
  defaultDate?: Date
  defaultDurationMinutes?: number
  editEntry?: TimeEntry
  onOpenChange: (open: boolean) => void
  open: boolean
  projectId: string
  requirements: Requirement[]
}

function toLocalDateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function parseDuration(input: string): number | null {
  const trimmed = input.trim().toLowerCase()

  const hm = trimmed.match(/^(\d+)\s*h\s*(\d+)\s*m?$/)
  if (hm) {
    return Number(hm.at(1)) * 60 + Number(hm.at(2))
  }

  const hOnly = trimmed.match(/^(\d+(?:\.\d+)?)\s*h$/)
  if (hOnly) {
    return Math.round(Number(hOnly.at(1)) * 60)
  }

  const mOnly = trimmed.match(/^(\d+)\s*m$/)
  if (mOnly) {
    return Number(mOnly.at(1))
  }

  const decimal = trimmed.match(/^(\d+(?:\.\d+)?)$/)
  if (decimal) {
    return Math.round(Number(decimal.at(1)) * 60)
  }

  return null
}

export function TimeEntryForm({
  open,
  onOpenChange,
  projectId,
  requirements,
  editEntry,
  defaultDate,
  defaultDurationMinutes,
}: TimeEntryFormProps) {
  const router = useRouter()
  const initialDate = editEntry
    ? new Date(editEntry.date)
    : (defaultDate ?? new Date())
  const form = useForm<TimeEntryFormValues>({
    resolver: zodResolver(timeEntryFormSchema),
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
    },
  })

  useEffect(() => {
    if (defaultDate && !editEntry) {
      form.setValue('date', toLocalDateString(defaultDate))
    }
  }, [defaultDate, editEntry, form])

  useEffect(() => {
    if (defaultDurationMinutes && !editEntry) {
      form.setValue('durationInput', formatMinutes(defaultDurationMinutes))
    }
  }, [defaultDurationMinutes, editEntry, form])

  const createAction = useAction(createTimeEntryAction, {
    onSuccess: () => {
      toast.success('Time entry created')
      onOpenChange(false)
      router.refresh()
      form.reset({
        requirementId: '',
        description: '',
        date: toLocalDateString(new Date()),
        durationInput: '',
        billable: true,
      })
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Failed to create time entry')
    },
  })

  const updateAction = useAction(updateTimeEntryAction, {
    onSuccess: () => {
      toast.success('Time entry updated')
      onOpenChange(false)
      router.refresh()
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Failed to update time entry')
    },
  })

  const isPending = createAction.isPending || updateAction.isPending

  function onSubmit(values: TimeEntryFormValues) {
    const minutes = parseDuration(values.durationInput)
    if (minutes === null || minutes <= 0) {
      toast.error('Invalid duration. Use formats like 1h30m, 1.5h, or 90m')
      return
    }

    if (editEntry) {
      updateAction.execute({
        timeEntryId: editEntry.id,
        requirementId: values.requirementId || null,
        description: values.description,
        date: values.date,
        durationMinutes: minutes,
        billable: values.billable,
      })
    } else {
      createAction.execute({
        projectId,
        requirementId: values.requirementId || undefined,
        description: values.description,
        date: values.date,
        durationMinutes: minutes,
        billable: values.billable,
      })
    }
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>{editEntry ? 'Edit' : 'Log'} Time Entry</DialogTitle>
          <DialogDescription>
            {editEntry
              ? 'Update the time entry details.'
              : 'Log time against a project requirement.'}
          </DialogDescription>
        </DialogHeader>

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
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
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
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
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
                    onCheckedChange={(checked) =>
                      field.onChange(checked === true)
                    }
                  />
                  <FieldLabel className='cursor-pointer font-normal'>
                    Billable
                  </FieldLabel>
                </Field>
              )}
            />
          </FieldGroup>

          <DialogFooter className='mt-6'>
            <Button
              onClick={() => onOpenChange(false)}
              type='button'
              variant='outline'
            >
              Cancel
            </Button>
            <Button
              disabled={isPending || editEntry?.status === 'admin_rejected'}
              loading={isPending}
              type='submit'
            >
              {editEntry ? 'Update Entry' : 'Log Entry'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
